import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Trip, Expense, FrequentExpense } from '../types';
import { useCurrencyConverter } from '../hooks/useCurrencyConverter';
import { useNotification } from '../context/NotificationContext';

const triggerHapticFeedback = () => {
    if (navigator.vibrate) navigator.vibrate(10);
};

// FIX: Timezone Bug Fix. This function generates a 'YYYY-MM-DD' string
// based on the user's local date, not UTC.
const getLocalDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const ExpenseForm: React.FC<{
    trip: Trip;
    expense?: Expense;
    onClose: () => void;
}> = ({ trip, expense, onClose }) => {
    const { addExpense, updateExpense, data } = useData();
    const { convert, formatCurrency } = useCurrencyConverter();
    const { addNotification } = useNotification();
    const [amount, setAmount] = useState(expense?.amount ? expense.amount.toString() : '');
    const [currency, setCurrency] = useState(expense?.currency || trip.mainCurrency);
    const [category, setCategory] = useState(expense?.category || data.categories[0]?.name || '');
    const [date, setDate] = useState(expense ? new Date(expense.date).toISOString().split('T')[0] : getLocalDateString());

    const amountInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Autofocus the amount input when the form opens
        amountInputRef.current?.focus();
    }, []);

    const handleFrequentExpenseClick = (freqExp: FrequentExpense) => {
        triggerHapticFeedback();
        setAmount(freqExp.amount.toString());
        setCategory(freqExp.category);
        setCurrency(trip.mainCurrency);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        triggerHapticFeedback();
        const numericAmount = parseFloat(amount);
        if (!numericAmount || numericAmount <= 0 || !category || !date) {
            addNotification("Per favore, compila tutti i campi correttamente.", 'error');
            return;
        }

        const expenseData = {
            amount: numericAmount,
            currency,
            category,
            date: new Date(date).toISOString(),
            // Country can be inferred from currency, no need to add it here
        };

        if (expense && expense.id) {
            updateExpense(trip.id, { ...expense, ...expenseData });
        } else {
            addExpense(trip.id, expenseData);
        }
        onClose();
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/,/, '.');
        // Allow only digits and a single decimal point
        if (/^\d*\.?\d*$/.test(value)) {
            setAmount(value);
        }
    };

    const numericAmount = parseFloat(amount) || 0;
    const convertedAmountDisplay = useMemo(() => {
        if (numericAmount > 0 && currency !== trip.mainCurrency) {
            const convertedValue = convert(numericAmount, currency, trip.mainCurrency);
            return `≈ ${formatCurrency(convertedValue, trip.mainCurrency)}`;
        }
        return null;
    }, [numericAmount, currency, trip.mainCurrency, convert, formatCurrency]);

    const dailyBalanceInfo = useMemo(() => {
        const tripStart = new Date(trip.startDate);
        const tripEnd = new Date(trip.endDate);
        const duration = Math.round((tripEnd.getTime() - tripStart.getTime()) / (1000 * 3600 * 24)) + 1;
        const dailyBudget = duration > 0 ? trip.totalBudget / duration : 0;

        if (dailyBudget <= 0) {
            return { dailyBudget: 0, remainingBalance: 0 };
        }

        const todayString = getLocalDateString();
        
        // Sum of all expenses for today, *excluding* the one we are currently editing
        const todaysExpensesTotal = trip.expenses
            .filter(exp => {
                const expDateString = new Date(exp.date).toISOString().split('T')[0];
                const isCurrentEditingExpense = expense && exp.id === expense.id;
                return expDateString === todayString && !isCurrentEditingExpense;
            })
            .reduce((sum, exp) => sum + convert(exp.amount, exp.currency, trip.mainCurrency), 0);
        
        const currentFormAmount = parseFloat(amount.replace(',', '.')) || 0;
        
        const remainingBalance = dailyBudget - todaysExpensesTotal - currentFormAmount;

        return { dailyBudget, remainingBalance };
    }, [trip, amount, expense, convert]);


    const currentCategoryIcon = data.categories.find(c => c.name === category)?.icon || '📝';

    return (
        <div className="fixed inset-0 bg-background z-50 flex flex-col animate-[slide-up_0.3s_ease-out]">
            <header className="flex items-center p-4 flex-shrink-0">
                <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-variant">
                    <span className="material-symbols-outlined">close</span>
                </button>
                <h1 className="text-xl font-bold ml-4">
                    {expense?.id ? 'Modifica Spesa' : 'Nuova Spesa'}
                </h1>
            </header>

            {/* Main content area that will scroll if needed */}
            <main className="flex-1 overflow-y-auto px-4 pb-28 space-y-4">
                 {trip.frequentExpenses && trip.frequentExpenses.length > 0 && !expense?.id && (
                    <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4">
                        {trip.frequentExpenses.map(freqExp => (
                            <button
                                key={freqExp.id}
                                type="button"
                                onClick={() => handleFrequentExpenseClick(freqExp)}
                                className="flex items-center gap-2 py-2 px-3 rounded-full text-left bg-surface-variant hover:bg-primary-container transition-colors focus:outline-none focus:ring-2 focus:ring-trip-primary flex-shrink-0 active:scale-95"
                                aria-label={`Aggiungi spesa rapida: ${freqExp.name}`}
                            >
                                <span className="text-xl" aria-hidden="true">{freqExp.icon}</span>
                                <span className="text-sm font-medium text-on-surface truncate">{freqExp.name}</span>
                            </button>
                        ))}
                    </div>
                )}
                
                {/* Amount & Currency */}
                <div className="bg-surface-variant rounded-2xl p-4">
                    <span className="text-sm font-medium text-on-surface-variant">Importo</span>
                    <div className="flex items-baseline justify-between mt-1">
                        <input
                            ref={amountInputRef}
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            value={amount}
                            onChange={handleAmountChange}
                            placeholder="0"
                            required
                            className="bg-transparent text-5xl font-bold text-on-surface w-full focus:outline-none placeholder:text-on-surface/30 tracking-tighter"
                        />
                         <select
                            value={currency}
                            onChange={e => setCurrency(e.target.value)}
                            required
                            className="bg-transparent text-xl font-semibold text-on-surface-variant focus:outline-none appearance-none pr-6"
                        >
                            {trip.preferredCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    {convertedAmountDisplay && (
                        <p className="text-right text-sm text-on-surface-variant mt-1">
                            {convertedAmountDisplay}
                        </p>
                    )}
                </div>

                {/* Category */}
                <div className="bg-surface-variant rounded-2xl flex items-center p-4 gap-4">
                    <span className="text-2xl w-8 text-center">{currentCategoryIcon}</span>
                    <select value={category} onChange={e => setCategory(e.target.value)} required className="w-full bg-transparent text-on-surface focus:outline-none appearance-none font-medium text-base">
                        {data.categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>

                {/* Date */}
                <div className="bg-surface-variant rounded-2xl flex items-center p-4 gap-4">
                     <span className="material-symbols-outlined text-on-surface-variant w-8 text-center">calendar_month</span>
                     <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        required
                        className="w-full bg-transparent text-on-surface focus:outline-none font-medium text-base"
                    />
                </div>

                {dailyBalanceInfo.dailyBudget > 0 && (
                    <div className="bg-surface-variant p-4 rounded-2xl text-center">
                        <p className="text-sm font-medium text-on-surface-variant">Saldo giornaliero rimanente</p>
                        <p className={`text-2xl font-bold mt-1 transition-colors ${dailyBalanceInfo.remainingBalance < 0 ? 'text-error' : 'text-on-surface'}`}>
                            {formatCurrency(dailyBalanceInfo.remainingBalance, trip.mainCurrency)}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-1">
                            Budget di oggi: {formatCurrency(dailyBalanceInfo.dailyBudget, trip.mainCurrency)}
                        </p>
                    </div>
                )}
            </main>

            {/* Fixed Footer with Save Button */}
            <footer className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t border-surface-variant flex-shrink-0">
                <button
                    onClick={handleSubmit}
                    className="w-full bg-trip-primary text-trip-on-primary font-bold py-4 rounded-2xl shadow-md hover:shadow-lg transition-shadow active:scale-[0.98]"
                >
                    {expense?.id ? 'Salva Modifiche' : 'Salva Spesa'}
                </button>
            </footer>

            <style>{`
                @keyframes slide-up {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-\\[slide-up_0\\.3s_ease-out\\] {
                    animation: slide-up 0.3s ease-out;
                }
                /* Hide number input arrows */
                input[type="number"]::-webkit-inner-spin-button,
                input[type="number"]::-webkit-outer-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                input[type="number"] {
                    -moz-appearance: textfield;
                }
                /* Style date input calendar icon */
                input[type="date"]::-webkit-calendar-picker-indicator {
                    background: none;
                    cursor: pointer;
                    width: 1.5rem; /* clickable area */
                    position: absolute;
                    right: 0;
                }
                input[type="date"] {
                    position: relative;
                }
                /* Custom select dropdown arrows */
                select {
                  -webkit-appearance: none;
                  -moz-appearance: none;
                  appearance: none;
                  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' class='bi bi-chevron-down' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E");
                  background-repeat: no-repeat;
                  background-position: right 0.75rem center;
                  background-size: 1em;
                  padding-right: 2rem;
                }
                select.pr-6 { /* For the smaller currency dropdown */
                    background-position: right 0 center;
                }
            `}</style>
        </div>
    );
};

export default ExpenseForm;