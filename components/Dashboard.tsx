import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useCurrencyConverter } from '../hooks/useCurrencyConverter';
import { Expense } from '../types';
import ExpenseForm from './ExpenseForm';
import ExpenseList from './ExpenseList';
import CurrencyConverter from './CurrencyConverter';
import CategoryBudgetTracker from './CategoryBudgetTracker';
import AIPanel from './AIPanel';
import Statistics from './Statistics';

interface DashboardProps {
    activeTripId: string;
    currentView: 'summary' | 'stats' | 'currency';
}

const useOutsideClick = (ref: React.RefObject<HTMLDivElement>, callback: () => void) => {
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                callback();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [ref, callback]);
};

const Dashboard: React.FC<DashboardProps> = ({ activeTripId, currentView }) => {
    const { data } = useData();
    const { convert } = useCurrencyConverter();
    const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
    const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
    
    type TimeFilter = 'today' | 'yesterday' | 'last3days';
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('last3days');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);
    useOutsideClick(filterRef, () => setIsFilterOpen(false));

    const activeTrip = data.trips.find(t => t.id === activeTripId);

    const formatCurrencyInteger = (amount: number, currency: string) => {
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const tripDuration = useMemo(() => {
        if (!activeTrip) return 0;
        const start = new Date(activeTrip.startDate);
        const end = new Date(activeTrip.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    }, [activeTrip]);

    const stats = useMemo(() => {
        if (!activeTrip || !activeTrip.expenses) return { totalSpent: 0, budget: 0, remaining: 0, dailyAvg: 0 };
        
        const totalSpent = activeTrip.expenses.reduce((sum, exp) => sum + convert(exp.amount, exp.currency, activeTrip.mainCurrency), 0);
        const budget = activeTrip.totalBudget;
        const remaining = budget - totalSpent;
        
        const tripStart = new Date(activeTrip.startDate).getTime();
        const now = new Date().getTime();
        const tripEnd = new Date(activeTrip.endDate).getTime();
        
        let daysElapsed = (now - tripStart) / (1000 * 3600 * 24);
        if (now < tripStart) daysElapsed = 0;
        if (now > tripEnd) daysElapsed = (tripEnd - tripStart) / (1000 * 3600 * 24);
        daysElapsed = Math.max(1, Math.ceil(daysElapsed));

        const dailyAvg = totalSpent / daysElapsed;

        return { totalSpent, budget, remaining, dailyAvg };
    }, [activeTrip, convert]);
    
    const sortedExpenses = useMemo(() => {
        if (!activeTrip || !activeTrip.expenses) return [];
        return [...activeTrip.expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [activeTrip]);

    const todaysExpenses = useMemo(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayString = `${year}-${month}-${day}`;
        
        return sortedExpenses.filter(exp => exp.date.startsWith(todayString));
    }, [sortedExpenses]);

    const todaysSpend = useMemo(() => {
        if (!activeTrip) return 0;
        return todaysExpenses.reduce((sum, exp) => sum + convert(exp.amount, exp.currency, activeTrip.mainCurrency), 0);
    }, [todaysExpenses, activeTrip, convert]);

    const dailyBudget = useMemo(() => {
        if (!activeTrip) return 0;
        const tripStart = new Date(activeTrip.startDate);
        const tripEnd = new Date(activeTrip.endDate);
        const duration = Math.round((tripEnd.getTime() - tripStart.getTime()) / (1000 * 3600 * 24)) + 1;
        return duration > 0 ? activeTrip.totalBudget / duration : 0;
    }, [activeTrip]);


    const filteredExpenses = useMemo(() => {
        let expenses = sortedExpenses;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (timeFilter === 'today') {
            expenses = expenses.filter(exp => new Date(exp.date).toDateString() === today.toDateString());
        } else if (timeFilter === 'yesterday') {
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            expenses = expenses.filter(exp => new Date(exp.date).toDateString() === yesterday.toDateString());
        } else if (timeFilter === 'last3days') {
            const threeDaysAgo = new Date(today);
            threeDaysAgo.setDate(today.getDate() - 2); // Includes today
            expenses = expenses.filter(exp => {
                const expDate = new Date(exp.date);
                return expDate >= threeDaysAgo && expDate <= now;
            });
        }
        return expenses;
    }, [sortedExpenses, timeFilter]);
    
    const handleEditExpense = (expense: Expense) => {
        setEditingExpense(expense);
        setIsExpenseFormOpen(true);
    };

    const handleAddExpense = () => {
        setEditingExpense(undefined);
        setIsExpenseFormOpen(true);
    };
    
    const handleFilterChange = (filter: TimeFilter) => {
        setTimeFilter(filter);
        setIsFilterOpen(false);
    };

    if (!activeTrip) {
        return <div className="p-8 text-center">Viaggio non trovato o non ancora selezionato.</div>;
    }
    
    const filterLabels: Record<TimeFilter, string> = {
        today: 'Oggi',
        yesterday: 'Ieri',
        last3days: 'Ultimi 3 giorni',
    };

    const summaryContent = (() => {
        const spentPercentage = stats.budget > 0 ? Math.min((stats.totalSpent / stats.budget) * 100, 100) : 0;
        const isOverBudget = stats.totalSpent > stats.budget;
        return (
            <div className="p-4 space-y-6">
                <header className="flex justify-between items-start">
                    <h1 className="text-3xl font-bold text-on-background">{activeTrip.name}</h1>
                    <div className="text-right">
                        <div className="flex items-center gap-2 text-on-surface-variant">
                             <span className="material-symbols-outlined text-lg">date_range</span>
                             <span className="font-medium">{tripDuration} Giorni</span>
                        </div>
                    </div>
                </header>
                
                <div className="grid grid-cols-2 gap-4 bg-surface-variant p-5 rounded-3xl">
                    {/* Today's Spend */}
                    <div className="text-center">
                        <p className="text-sm font-medium text-on-surface-variant">Spesa Oggi</p>
                        <p className="text-4xl font-bold tracking-tighter text-on-surface mt-1">
                            {formatCurrencyInteger(todaysSpend, activeTrip.mainCurrency)}
                        </p>
                    </div>
                    {/* Daily Budget */}
                    <div className="text-center border-l border-outline/30">
                        <p className="text-sm font-medium text-on-surface-variant">Budget Giorno</p>
                        <p className="text-4xl font-bold tracking-tighter text-on-surface mt-1">
                            {formatCurrencyInteger(dailyBudget, activeTrip.mainCurrency)}
                        </p>
                    </div>
                </div>

                {/* Total Budget Progress Bar */}
                <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-baseline">
                        <p className="text-base font-medium text-on-surface">Budget Totale</p>
                        <p className="text-sm text-on-surface-variant">
                            {formatCurrencyInteger(stats.totalSpent, activeTrip.mainCurrency)} / {formatCurrencyInteger(stats.budget, activeTrip.mainCurrency)}
                        </p>
                    </div>
                    <div className="w-full bg-surface-variant rounded-full h-2.5">
                        <div 
                            className="h-2.5 rounded-full" 
                            style={{ 
                                width: `${spentPercentage}%`, 
                                backgroundColor: isOverBudget ? 'var(--color-error)' : 'var(--color-primary)', 
                                transition: 'width 0.5s ease-out' 
                            }}>
                        </div>
                    </div>
                </div>
                
                {activeTrip.enableCategoryBudgets && <CategoryBudgetTracker trip={activeTrip} expenses={filteredExpenses} />}
                
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-on-surface">Spese Recenti</h2>
                    <div className="relative" ref={filterRef}>
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="flex items-center gap-1.5 text-sm font-medium text-on-surface-variant py-1.5 px-3 rounded-full hover:bg-surface-variant transition-colors"
                        >
                            <span>{filterLabels[timeFilter]}</span>
                            <span className="material-symbols-outlined text-base">expand_more</span>
                        </button>
                        {isFilterOpen && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-inverse-surface rounded-xl shadow-lg z-10 p-2 animate-fade-in" style={{ animationDuration: '150ms' }}>
                                {(Object.keys(filterLabels) as TimeFilter[]).map(key => (
                                     <button
                                        key={key}
                                        onClick={() => handleFilterChange(key)}
                                        className="w-full text-left p-2 rounded-lg text-inverse-on-surface hover:bg-on-surface/10"
                                    >
                                        {filterLabels[key]}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <ExpenseList expenses={filteredExpenses} trip={activeTrip} onEditExpense={handleEditExpense} />
            </div>
        );
    })();
    
    const statsContent = (
        <div className="p-4 space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-on-background">Statistiche: {activeTrip.name}</h1>
            </header>
            <Statistics trip={activeTrip} expenses={sortedExpenses} />
        </div>
    );
    
    const currencyContent = (
        <div className="p-4 space-y-6">
             <header>
                <h1 className="text-3xl font-bold text-on-background">Valute: {activeTrip.name}</h1>
            </header>
            <CurrencyConverter trip={activeTrip} />
        </div>
    );
    
    return (
        <div className="relative min-h-screen">
            {/* Scrollable content with animation */}
            <div className="animate-fade-in">
                {currentView === 'summary' && summaryContent}
                {currentView === 'stats' && statsContent}
                {currentView === 'currency' && currencyContent}
            </div>
            
            {/* Fixed Action Buttons */}
            <div className="fixed bottom-20 right-4 flex flex-col items-center gap-3 z-20">
                 <button 
                    onClick={() => setIsAIPanelOpen(true)}
                    className="h-10 w-10 bg-secondary-container text-on-secondary-container rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110"
                    aria-label="Assistente AI"
                >
                    <span className="material-symbols-outlined text-lg">auto_awesome</span>
                </button>
                <button 
                    onClick={handleAddExpense}
                    className="h-12 w-12 bg-primary text-on-primary rounded-2xl shadow-lg flex items-center justify-center transition-transform hover:scale-110"
                    aria-label="Aggiungi spesa"
                >
                    <span className="material-symbols-outlined text-xl">add</span>
                </button>
            </div>

            {/* Modals */}
            {isExpenseFormOpen && (
                <ExpenseForm
                    trip={activeTrip}
                    expense={editingExpense}
                    onClose={() => setIsExpenseFormOpen(false)}
                />
            )}
            {isAIPanelOpen && (
                <AIPanel 
                    trip={activeTrip} 
                    expenses={sortedExpenses} 
                    onClose={() => setIsAIPanelOpen(false)} 
                />
            )}
        </div>
    );
};

export default Dashboard;