import React, { useState, useMemo, useRef, useEffect, lazy, Suspense, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { useCurrency } from '../context/CurrencyContext';
import { useCurrencyConverter } from '../hooks/useCurrencyConverter';
import { Expense, Trip } from '../types';
import ExpenseList from './ExpenseList';
import CurrencyConverter from './CurrencyConverter';
import CategoryBudgetTracker from './CategoryBudgetTracker';
import ExpenseListSkeleton from './ExpenseListSkeleton';

const ExpenseForm = lazy(() => import('./ExpenseForm'));
const AIPanel = lazy(() => import('./AIPanel'));
const Statistics = lazy(() => import('./Statistics'));

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

const triggerHapticFeedback = () => {
    if (navigator.vibrate) navigator.vibrate(10);
};

const StatisticsSkeleton = () => (
    <div className="space-y-6 animate-pulse">
        {/* Mimic SpendingDonutChart and filter buttons */}
        <div className="bg-surface-variant/50 p-4 rounded-3xl">
            <div className="w-full h-56 relative flex flex-col items-center justify-center">
                <div className="w-36 h-36 bg-surface rounded-full"></div>
            </div>
            <div className="flex justify-center items-center gap-2 p-1 mt-4 bg-surface rounded-full">
                <div className="h-10 flex-1 bg-secondary-container/20 rounded-full"></div>
                <div className="h-10 flex-1 bg-secondary-container/20 rounded-full"></div>
                <div className="h-10 flex-1 bg-secondary-container/20 rounded-full"></div>
                <div className="h-10 flex-1 bg-secondary-container/20 rounded-full"></div>
            </div>
        </div>
        {/* Mimic GroupedSpendingList */}
        <div className="bg-surface-variant/50 p-4 rounded-3xl space-y-2">
            <div className="h-8 w-1/3 bg-surface rounded-lg"></div>
            <div className="h-16 bg-surface rounded-lg mt-4"></div>
            <div className="h-16 bg-surface rounded-lg"></div>
            <div className="h-16 bg-surface rounded-lg"></div>
        </div>
    </div>
);


const Dashboard: React.FC<DashboardProps> = ({ activeTripId, currentView }) => {
    const { data, refetchData } = useData();
    const { updateRates } = useCurrency();
    const { convert } = useCurrencyConverter();
    const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
    const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFiltering, setIsFiltering] = useState(false);
    
    type TimeFilter = 'today' | 'yesterday' | 'last3days';
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('last3days');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);
    useOutsideClick(filterRef, () => setIsFilterOpen(false));

    // Pull to refresh state
    const [pullStart, setPullStart] = useState<number | null>(null);
    const [pullDelta, setPullDelta] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const pullThreshold = 80;

    const activeTrip = useMemo(() => data.trips.find(t => t.id === activeTripId), [data.trips, activeTripId]);

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
        
        if (searchQuery.trim() !== '') {
            const lowercasedQuery = searchQuery.toLowerCase();
            expenses = expenses.filter(exp => 
                exp.category.toLowerCase().includes(lowercasedQuery) ||
                exp.amount.toString().includes(lowercasedQuery) ||
                exp.currency.toLowerCase().includes(lowercasedQuery)
            );
        }
        
        // After filtering is done, turn off the filtering state
        // Using setTimeout to defer this to the next event loop cycle
        // ensuring the UI has a chance to render the skeleton first.
        setTimeout(() => setIsFiltering(false), 0);

        return expenses;
    }, [sortedExpenses, timeFilter, searchQuery]);
    
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsFiltering(true);
        setSearchQuery(e.target.value);
    };

    const handleEditExpense = useCallback((expense: Expense) => {
        setEditingExpense(expense);
        setIsExpenseFormOpen(true);
    }, []);

    const handleAddExpense = useCallback(() => {
        triggerHapticFeedback();
        setEditingExpense(undefined);
        setIsExpenseFormOpen(true);
    }, []);
    
    const handleAIPanelOpen = useCallback(() => {
        triggerHapticFeedback();
        setIsAIPanelOpen(true);
    }, []);

    const handleFilterChange = useCallback((filter: TimeFilter) => {
        setTimeFilter(filter);
        setIsFilterOpen(false);
    }, []);

    const handleRefresh = useCallback(async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        triggerHapticFeedback();
        // A small haptic feedback on refresh start
        if (navigator.vibrate) navigator.vibrate(20); 

        await Promise.all([
            refetchData(),
            updateRates()
        ]);

        // Give a moment for the user to see the checkmark
        setTimeout(() => {
            setIsRefreshing(false);
            setPullDelta(0);
        }, 500);
    }, [isRefreshing, refetchData, updateRates]);

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        if (window.scrollY === 0) {
            setPullStart(e.touches[0].clientY);
        }
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (pullStart === null || isRefreshing) return;
        
        const delta = e.touches[0].clientY - pullStart;
        if (delta > 0) {
             // Dampen the pull effect for a more natural feel
            const dampenedDelta = Math.pow(delta, 0.85);
            setPullDelta(dampenedDelta);
        }
    };

    const handleTouchEnd = () => {
        if (isRefreshing) return;
        
        if (pullDelta > pullThreshold) {
            setPullDelta(60); // Snap to loading position
            handleRefresh();
        } else {
            setPullDelta(0);
        }
        setPullStart(null);
    };

    if (!activeTrip) {
        return <div className="p-8 text-center">Viaggio non trovato o non ancora selezionato.</div>;
    }
    
    const filterLabels: Record<TimeFilter, string> = {
        today: 'Oggi',
        yesterday: 'Ieri',
        last3days: 'Ultimi 3 giorni',
    };

    const [integerPart, decimalPart] = new Intl.NumberFormat('it-IT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(stats.totalSpent).split(',');


    const summaryContent = (
        <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
            <div
                className="absolute top-0 left-0 right-0 flex justify-center items-center -z-10 transition-transform"
                style={{ transform: `translateY(${Math.min(pullDelta, 60)}px)` }}
            >
                <div 
                    className="p-3 bg-surface-variant rounded-full mt-2 transition-opacity"
                    style={{ opacity: isRefreshing ? 1 : Math.min(pullDelta / pullThreshold, 1) }}
                >
                     {isRefreshing ? (
                        <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <span 
                            className="material-symbols-outlined text-on-surface-variant transition-transform" 
                            style={{ transform: `rotate(${Math.min(pullDelta / pullThreshold, 1) * 180}deg)` }}
                        >
                            arrow_downward
                        </span>
                    )}
                </div>
            </div>
            <div 
                className="transition-transform"
                style={{ transform: `translateY(${pullDelta}px)` }}
            >
                 {/* FIX: Removed redundant and incorrect inline style that caused a TypeScript error. The 'backdrop-blur-xl' class handles this functionality correctly. */}
                 <div className="pt-12 px-6 pb-6 bg-surface-variant/20 dark:bg-surface/10 backdrop-blur-xl rounded-b-[2.5rem] shadow-sm">
                    <header className="flex justify-between items-center">
                        <button className="w-11 h-11 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center transition-colors hover:bg-black/10 dark:hover:bg-white/10">
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <h1 className="text-lg font-semibold text-on-surface truncate px-2">{activeTrip.name}</h1>
                        <button onClick={handleRefresh} className="w-11 h-11 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center transition-colors hover:bg-black/10 dark:hover:bg-white/10" aria-label="Aggiorna dati">
                             <span className={`material-symbols-outlined ${isRefreshing ? 'animate-spin' : ''}`}>refresh</span>
                        </button>
                    </header>
                    
                    <div className="text-center my-10">
                         <div className="flex justify-center items-baseline gap-2">
                             <h2 className="text-5xl lg:text-6xl font-bold tracking-tighter text-on-background">
                                {integerPart}<span className="text-4xl lg:text-5xl opacity-80">,{decimalPart}</span>
                            </h2>
                            <span className="text-base font-medium text-on-surface-variant tracking-wider">{activeTrip.mainCurrency}</span>
                         </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Spesa Oggi</p>
                            <p className="text-2xl font-bold tracking-tight text-on-surface mt-1">
                                {formatCurrencyInteger(todaysSpend, activeTrip.mainCurrency)}
                            </p>
                        </div>
                        <div className="text-center">
                             <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Budget Giorno</p>
                            <p className="text-2xl font-bold tracking-tight text-on-surface mt-1">
                                {formatCurrencyInteger(dailyBudget, activeTrip.mainCurrency)}
                            </p>
                        </div>
                    </div>
                </div>


                <div className="p-4 space-y-6">
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
                                    width: `${stats.budget > 0 ? Math.min((stats.totalSpent / stats.budget) * 100, 100) : 0}%`, 
                                    backgroundColor: stats.totalSpent > stats.budget ? 'var(--color-error)' : 'var(--trip-primary, var(--color-primary))', 
                                    transition: 'width 0.5s ease-out, background-color 0.3s ease-out' 
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
                    
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/70 pointer-events-none">search</span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder="Cerca per categoria, importo, valuta..."
                            className="w-full bg-surface-variant border-2 border-transparent rounded-full py-3 pl-12 pr-4 text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    
                     <div className="min-h-[250px]">
                        {isFiltering ? (
                            <ExpenseListSkeleton />
                        ) : (
                            <ExpenseList expenses={filteredExpenses} trip={activeTrip} onEditExpense={handleEditExpense} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
    
    const statsContent = (
        <div className="p-4 space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-on-background">Statistiche: {activeTrip.name}</h1>
            </header>
            <Suspense fallback={<StatisticsSkeleton />}>
                <Statistics trip={activeTrip} expenses={sortedExpenses} />
            </Suspense>
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
            <div className="relative">
                {currentView === 'summary' && summaryContent}
                {currentView === 'stats' && statsContent}
                {currentView === 'currency' && currencyContent}
            </div>
            
            {/* Fixed Action Buttons */}
            <div className="fixed bottom-20 right-4 flex flex-col items-center gap-3 z-20">
                 <button 
                    onClick={handleAIPanelOpen}
                    className="h-10 w-10 bg-secondary-container text-on-secondary-container rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-90"
                    aria-label="Assistente AI"
                >
                    <span className="material-symbols-outlined text-lg">auto_awesome</span>
                </button>
                <button 
                    onClick={handleAddExpense}
                    className="h-12 w-12 bg-trip-primary text-trip-on-primary rounded-2xl shadow-lg flex items-center justify-center transition-transform active:scale-90"
                    aria-label="Aggiungi spesa"
                >
                    <span className="material-symbols-outlined text-xl">add</span>
                </button>
            </div>

            {/* Modals */}
            {isExpenseFormOpen && (
                <Suspense fallback={<div />}>
                    <ExpenseForm
                        trip={activeTrip}
                        expense={editingExpense}
                        onClose={() => setIsExpenseFormOpen(false)}
                    />
                </Suspense>
            )}
            {isAIPanelOpen && (
                 <Suspense fallback={<div />}>
                    <AIPanel 
                        trip={activeTrip} 
                        expenses={sortedExpenses} 
                        onClose={() => setIsAIPanelOpen(false)} 
                    />
                </Suspense>
            )}
        </div>
    );
};

export default Dashboard;