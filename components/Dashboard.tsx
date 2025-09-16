import React, { useState, useMemo, useRef } from 'react';
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

const QuickStat: React.FC<{ title: string; value: string; icon: string; onClick?: () => void; }> = ({ title, value, icon, onClick }) => {
    const commonClasses = "flex-1 p-4 rounded-3xl flex items-center gap-4 bg-surface-variant min-w-[150px] text-left w-full h-full";
    const content = (
        <>
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-secondary-container/50 text-on-secondary-container">
                <span className="material-symbols-outlined text-xl">{icon}</span>
            </div>
            <div>
                <p className="text-sm text-on-surface-variant">{title}</p>
                <p className="text-lg font-bold text-on-surface">{value}</p>
            </div>
        </>
    );

    if (onClick) {
        return (
            <button
                onClick={onClick}
                className={`${commonClasses} cursor-pointer hover:bg-outline/20 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary`}
            >
                {content}
            </button>
        );
    }

    return <div className={commonClasses}>{content}</div>;
};


const Dashboard: React.FC<DashboardProps> = ({ activeTripId, currentView }) => {
    const { data } = useData();
    const { convert, formatCurrency } = useCurrencyConverter();
    const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
    const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
    
    const [dateFilter, setDateFilter] = useState('all');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedDayForDetail, setSelectedDayForDetail] = useState<string | null>(null);

    // FIX: Removed useMemo for activeTrip. This was causing a subtle bug where parts of the UI
    // would not update after adding an expense. By directly finding the trip on each render,
    // we ensure all components always have the freshest data.
    const activeTrip = data.trips.find(t => t.id === activeTripId);

    const tripDuration = useMemo(() => {
        if (!activeTrip) return 0;
        const start = new Date(activeTrip.startDate);
        const end = new Date(activeTrip.endDate);
        const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
        return duration;
    }, [activeTrip]);
    
    const formatCurrencyRounded = (amount: number, currency: string) => {
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

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
        // Sort by insertion time (ID is a timestamp) in descending order.
        return [...activeTrip.expenses].sort((a, b) => parseInt(b.id) - parseInt(a.id));
    }, [activeTrip]);

    const todaysExpenses = useMemo(() => {
        // FIX: Timezone bug fix. Instead of creating a local date object,
        // we get the local date string (e.g., "2023-10-27") and compare it
        // against the stored ISO date string's prefix. This correctly
        // identifies "today's" expenses regardless of the user's timezone.
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
        if (selectedDayForDetail) {
             return expenses.filter(exp => new Date(exp.date).toISOString().split('T')[0] === selectedDayForDetail);
        }
        if (dateFilter !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            if (dateFilter === 'today') {
                expenses = expenses.filter(exp => new Date(exp.date) >= today);
            } else if (dateFilter === 'week') {
                const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                expenses = expenses.filter(exp => new Date(exp.date) >= oneWeekAgo);
            } else if (dateFilter === 'month') {
                const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                expenses = expenses.filter(exp => new Date(exp.date) >= oneMonthAgo);
            }
        }
        if (selectedCategories.length > 0) {
            expenses = expenses.filter(exp => selectedCategories.includes(exp.category));
        }
        return expenses;
    }, [sortedExpenses, dateFilter, selectedCategories, selectedDayForDetail]);
    
    const isFilterActive = dateFilter !== 'all' || selectedCategories.length > 0 || selectedDayForDetail !== null;

    const clearFilters = () => {
        setDateFilter('all');
        setSelectedCategories([]);
        setSelectedDayForDetail(null);
    };

    const handleFilterToday = () => {
        setDateFilter('today');
        setSelectedCategories([]);
        setSelectedDayForDetail(null);
    }
    
    const handleEditExpense = (expense: Expense) => {
        setEditingExpense(expense);
        setIsExpenseFormOpen(true);
    };

    const handleAddExpense = () => {
        setEditingExpense(undefined);
        setIsExpenseFormOpen(true);
    };

    if (!activeTrip) {
        return <div className="p-8 text-center">Viaggio non trovato o non ancora selezionato.</div>;
    }

    const renderContent = () => {
        switch (currentView) {
            case 'summary':
                const spentPercentage = stats.budget > 0 ? Math.min((stats.totalSpent / stats.budget) * 100, 100) : 0;
                const isOverBudget = stats.totalSpent > stats.budget;
                return (
                     <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <QuickStat
                                title="Spesa di Oggi"
                                value={formatCurrency(todaysSpend, activeTrip.mainCurrency)}
                                icon="today"
                                onClick={handleFilterToday}
                            />
                            <QuickStat
                                title="Budget Oggi"
                                value={formatCurrency(dailyBudget, activeTrip.mainCurrency)}
                                icon="track_changes"
                            />
                        </div>
                        
                        <div className={`p-4 rounded-3xl ${isOverBudget ? 'bg-error/20' : 'bg-surface-variant'}`}>
                             <div className="flex justify-between items-center text-on-surface mb-2">
                                <span className="font-bold text-lg">{formatCurrencyRounded(stats.totalSpent, activeTrip.mainCurrency)}</span>
                                <span className="font-medium text-lg text-on-surface-variant">{formatCurrencyRounded(stats.remaining, activeTrip.mainCurrency)}</span>
                            </div>
                            <div className="relative w-full h-2 bg-on-surface/10 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ease-in-out ${isOverBudget ? 'bg-error' : 'bg-primary'}`}
                                    style={{ width: `${spentPercentage}%` }}
                                    role="progressbar"
                                    aria-valuenow={stats.totalSpent}
                                    aria-valuemin={0}
                                    aria-valuemax={stats.budget}
                                />
                            </div>
                        </div>

                        <ExpenseList
                            expenses={filteredExpenses}
                            trip={activeTrip}
                            onEditExpense={handleEditExpense}
                        />
                    </div>
                );
            case 'currency':
                 return (
                    <div className="max-w-2xl mx-auto">
                        <CurrencyConverter trip={activeTrip} />
                    </div>
                );
            case 'stats':
                return <Statistics trip={activeTrip} expenses={sortedExpenses} />;
            default:
                return null;
        }
    };

    return (
        <div>
            <header className="flex justify-between items-baseline px-4 sm:px-6 lg:px-8 pt-6 pb-2">
                <h1 className="text-3xl font-bold text-on-surface">{activeTrip.name}</h1>
                <p className="text-lg font-medium text-on-surface-variant">{tripDuration} G</p>
            </header>

            <div className="p-4 sm:p-6 lg:p-8">
                {renderContent()}
            </div>

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
                    expenses={filteredExpenses}
                    onClose={() => setIsAIPanelOpen(false)} 
                />
            )}

            <div className="fixed bottom-24 right-6 lg:bottom-6 z-40 flex flex-col items-end gap-4">
                 <button 
                    onClick={() => setIsAIPanelOpen(true)} 
                    className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-variant text-on-surface-variant shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-secondary" 
                    aria-label="Apri assistente AI"
                >
                    <span className="material-symbols-outlined">auto_awesome</span>
                </button>
                <button 
                    onClick={handleAddExpense} 
                    className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary" 
                    aria-label="Aggiungi nuova spesa"
                >
                    <span className="material-symbols-outlined text-3xl">add</span>
                </button>
            </div>
        </div>
    );
};

export default Dashboard;