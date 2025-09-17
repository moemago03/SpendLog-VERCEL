import React, { useState, useMemo, useRef, useEffect, lazy, Suspense, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { useCurrency } from '../context/CurrencyContext';
import { useCurrencyConverter } from '../hooks/useCurrencyConverter';
import { Expense, Trip } from '../types';
import ExpenseList from './ExpenseList';
import CurrencyConverter from './CurrencyConverter';
import CategoryBudgetTracker from './CategoryBudgetTracker';
import ExpenseListSkeleton from './ExpenseListSkeleton';
import FloatingActionButtons from './layout/FloatingActionButtons';

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
    const { convert, formatCurrency } = useCurrencyConverter();
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
                <div className="p-4">
                    <style>{`
                        @keyframes shimmer {
                            0% { transform: translateX(-100%) rotate(-10deg); }
                            100% { transform: translateX(100%) rotate(-10deg); }
                        }
                        .animate-shimmer {
                            animation: shimmer 2.5s infinite linear;
                        }
                    `}</style>
                    <div className="relative overflow-hidden rounded-3xl bg-surface p-6 shadow-lg animate-fade-in">
                        <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer opacity-50 dark:opacity-100"></div>

                        <div className="absolute top-4 left-4 z-10">
                            <span className="px-3 py-1 text-xs font-bold rounded-full" style={{ backgroundColor: activeTrip.color, color: 'var(--trip-on-primary)' }}>
                                {activeTrip.name}
                            </span>
                        </div>

                        <div className="relative z-10 flex items-center justify-between mt-10">
                            <div className="flex-1 pr-4">
                                <p className="text-sm text-on-surface-variant mb-1">Spesa Totale</p>
                                <p className="text-5xl font-bold text-on-surface tracking-tighter">
                                    {formatCurrency(stats.totalSpent, activeTrip.mainCurrency)}
                                </p>
                            </div>
                            
                            <div className="text-right space-y-3">
                                <div>
                                    <p className="text-xs text-on-surface-variant">Rimanente</p>
                                    <p className={`text-lg font-semibold tracking-tight ${stats.remaining < 0 ? 'text-error' : 'text-on-surface'}`}>
                                        {formatCurrencyInteger(stats.remaining, activeTrip.mainCurrency)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-on-surface-variant">Media Giorno</p>
                                    <p className="text-lg font-semibold tracking-tight text-on-surface">
                                        {formatCurrencyInteger(stats.dailyAvg, activeTrip.mainCurrency)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                <div className="p-4 space-y-6">
                     <div className="bg-surface p-4 rounded-3xl shadow-sm space-y-3">
                        <div className="flex justify-between items-baseline">
                            <p className="text-base font-medium text-on-surface">Budget Totale</p>
                             <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                                <span className="material-symbols-outlined text-base">account_balance_wallet</span>
                                 <span>
                                    Rimanente: {formatCurrencyInteger(stats.remaining, activeTrip.mainCurrency)}
                                </span>
                             </div>
                        </div>
                        <div className="w-full bg-surface-variant rounded-full h-4 relative overflow-hidden">
                            <div 
                                className="h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end" 
                                style={{ 
                                    width: `${stats.budget > 0 ? Math.min((stats.totalSpent / stats.budget) * 100, 100) : 0}%`, 
                                    backgroundImage: `linear-gradient(to right, ${stats.totalSpent > stats.budget ? 'var(--color-error)' : activeTrip.color || 'var(--color-primary)'}, ${stats.totalSpent > stats.budget ? '#ff8a80' : 'var(--color-inverse-primary)'})`,
                                }}>
                                    <div className="w-1.5 h-1.5 bg-white/50 rounded-full mr-1.5"></div>
                            </div>
                        </div>
                         <p className="text-xs text-on-surface-variant text-right">
                                {formatCurrencyInteger(stats.totalSpent, activeTrip.mainCurrency)} di {formatCurrencyInteger(stats.budget, activeTrip.mainCurrency)}
                            </p>
                    </div>
                    
                    {activeTrip.enableCategoryBudgets && <CategoryBudgetTracker trip={activeTrip} expenses={filteredExpenses} />}
                    
                    <div className="flex justify-between items-center pt-4">
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
        <>
            <div>
                {currentView === 'summary' && summaryContent}
                {currentView === 'stats' && statsContent}
                {currentView === 'currency' && currencyContent}
            </div>
            
            <FloatingActionButtons 
                onAddExpense={handleAddExpense} 
                onAIPanelOpen={handleAIPanelOpen} 
            />

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
        </>
    );
};

export default Dashboard;