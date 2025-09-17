import React, { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react';
import { Trip, Expense } from '../types';
import { useData } from '../context/DataContext';
import { useCurrencyConverter } from '../hooks/useCurrencyConverter';
import { PieChart, Pie, ResponsiveContainer, Cell } from 'recharts';
import { CURRENCY_INFO, FLAG_SVGS } from '../constants';

type TimePeriod = 'week' | 'month' | '6months' | 'all';
type GroupByType = 'category' | 'country' | 'currency';

// ===================================================================================
// Helper components and functions
// ===================================================================================

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

// ===================================================================================
// Chart Components (Styled according to screenshots)
// ===================================================================================

const SpendingDonutChart: React.FC<{ data: any[], total: number; currency: string; timeLabel: string }> = ({ data, total, currency, timeLabel }) => {
    const colors = ['var(--color-primary)', 'var(--color-tertiary)', 'var(--color-secondary)', '#10B981', '#F59E0B', '#EF4444'];
    
    return (
        <div className="w-full h-56 relative flex flex-col items-center justify-center">
            <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                         <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius="82%"
                            outerRadius="100%"
                            dataKey="amount"
                            startAngle={90}
                            endAngle={450}
                            stroke="none"
                        >
                          {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                          ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="text-center">
                <p className="text-on-surface-variant text-sm">Hai speso</p>
                <p className="text-4xl font-bold text-on-surface tracking-tighter">
                    {new Intl.NumberFormat('it-IT', {
                        style: 'currency',
                        currency: currency,
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                    }).format(total)}
                </p>
                <p className="text-sm text-on-surface-variant">{timeLabel}</p>
            </div>
        </div>
    );
};

// ===================================================================================
// Grouped List Components
// ===================================================================================
const GroupedSpendingItem: React.FC<{ item: any; currency: string; }> = ({ item, currency }) => {
    const { formatCurrency } = useCurrencyConverter();
    return (
        <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 flex items-center justify-center bg-surface rounded-full text-xl">{item.icon}</div>
                <div className="truncate">
                    <p className="font-semibold text-on-surface truncate">{item.name}</p>
                    <p className="text-sm text-on-surface-variant">{item.count} transazioni</p>
                </div>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
                <p className="font-semibold text-on-surface">{formatCurrency(item.amount, currency)}</p>
                <p className="text-sm text-on-surface-variant">{item.percentage.toFixed(0)}%</p>
            </div>
        </div>
    );
};

const GroupedSpendingList: React.FC<{ data: any[]; currency: string; groupBy: GroupByType; setGroupBy: (g: GroupByType) => void; }> = ({ data, currency, groupBy, setGroupBy }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    useOutsideClick(menuRef, () => setIsMenuOpen(false));

    const groupOptions: { key: GroupByType, label: string; icon: string }[] = [
        { key: 'category', label: 'Categoria', icon: 'category' },
        { key: 'country', label: 'Paese/Regione', icon: 'public' },
        { key: 'currency', label: 'Valuta', icon: 'paid' },
    ];
    
    const currentLabel = groupOptions.find(opt => opt.key === groupBy)?.label || 'Categoria';

    return (
        <div className="bg-surface-variant p-4 rounded-3xl">
            <div className="flex justify-between items-center mb-2">
                <div className="relative" ref={menuRef}>
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-1 text-lg font-bold text-on-surface hover:bg-surface/50 p-2 rounded-lg">
                        Per {currentLabel}
                        {/* FIX: Corrected typo from `isMenu-open` to `isMenuOpen` to fix reference and type errors. */}
                        <span className={`material-symbols-outlined transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}>expand_more</span>
                    </button>
                    {isMenuOpen && (
                        <div className="absolute top-full mt-2 w-48 bg-inverse-surface rounded-xl shadow-lg z-10 p-2">
                            {groupOptions.map(opt => (
                                <button
                                    key={opt.key}
                                    onClick={() => { setGroupBy(opt.key); setIsMenuOpen(false); }}
                                    className="w-full text-left flex items-center gap-3 p-2 rounded-lg text-inverse-on-surface hover:bg-on-surface/10"
                                >
                                    <span className="material-symbols-outlined text-base">{opt.icon}</span>
                                    <span>{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {data.length > 0 ? (
                <div className="divide-y divide-outline/20">
                    {data.map(item => <GroupedSpendingItem key={item.name} item={item} currency={currency} />)}
                </div>
            ) : (
                <div className="text-center py-8 text-on-surface-variant">
                    <p>Nessuna spesa in questo periodo.</p>
                </div>
            )}
        </div>
    );
};

const ChartSkeleton: React.FC = () => (
    <div className="bg-surface-variant/50 p-4 rounded-3xl">
        <div className="w-full h-56 relative flex flex-col items-center justify-center">
            <div className="w-36 h-36 bg-surface rounded-full"></div>
        </div>
    </div>
);

const ListSkeleton: React.FC = () => (
    <div className="bg-surface-variant/50 p-4 rounded-3xl space-y-2">
        <div className="h-8 w-1/3 bg-surface rounded-lg"></div>
        <div className="h-16 bg-surface rounded-lg mt-4"></div>
        <div className="h-16 bg-surface rounded-lg"></div>
        <div className="h-16 bg-surface rounded-lg"></div>
    </div>
);

// ===================================================================================
// Main Statistics Component
// ===================================================================================

const Statistics: React.FC<{ trip: Trip; expenses: Expense[] }> = ({ trip, expenses }) => {
    const { data: { categories } } = useData();
    const { convert } = useCurrencyConverter();
    const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
    const [groupBy, setGroupBy] = useState<GroupByType>('category');

    const processedData = useMemo(() => {
        const now = new Date();
        let startDate = new Date(trip.startDate);

        switch (timePeriod) {
            case 'week':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case '6months':
                 startDate = new Date(new Date(now).setMonth(now.getMonth() - 6));
                 break;
            case 'all':
            default:
                startDate = new Date(trip.startDate);
                break;
        }

        const filtered = expenses.filter(e => new Date(e.date) >= startDate);
        const totalSpent = filtered.reduce((sum, exp) => sum + convert(exp.amount, exp.currency, trip.mainCurrency), 0);

        // Grouping logic
        const groupMap = new Map<string, { amount: number; count: number }>();
        filtered.forEach(exp => {
            let key: string | undefined;
            switch(groupBy) {
                case 'category': key = exp.category; break;
                case 'country': key = exp.country || 'Sconosciuto'; break;
                case 'currency': key = exp.currency; break;
            }
            if (key) {
                const current = groupMap.get(key) || { amount: 0, count: 0 };
                current.amount += convert(exp.amount, exp.currency, trip.mainCurrency);
                current.count++;
                groupMap.set(key, current);
            }
        });
        
        const getIcon = (key: string) => {
             switch(groupBy) {
                case 'category': return categories.find(c => c.name === key)?.icon || '💸';
                case 'country': return '🌍';
                case 'currency':
                    const info = CURRENCY_INFO[key];
                    const flagSvg = info ? FLAG_SVGS[info.flag.toUpperCase()] : null;
                    if(flagSvg) return <img src={flagSvg} alt={key} className="w-5 h-5 rounded-full" />;
                    return '💰';
             }
        }

        const groupedData = Array.from(groupMap.entries()).map(([name, data]) => ({
            name,
            amount: data.amount,
            count: data.count,
            percentage: totalSpent > 0 ? (data.amount / totalSpent) * 100 : 0,
            icon: getIcon(name),
        })).sort((a, b) => b.amount - a.amount);
        
        return { totalSpent, groupedData };
    }, [expenses, timePeriod, groupBy, trip, convert, categories]);

    const timePeriodLabels: Record<TimePeriod, string> = { week: '1s', month: '1m', '6months': '6m', all: 'Sempre' };
    const timePeriodFullLabels: Record<TimePeriod, string> = { week: 'Questa settimana', month: 'Questo mese', '6months': 'Ultimi 6 mesi', all: 'Sempre' };

    return (
        <div className="space-y-6">
            <div>
                 <div className="flex items-center justify-between mb-4">
                    <h2 className="text-3xl font-bold">Statistiche</h2>
                </div>
                <Suspense fallback={<ChartSkeleton />}>
                    <SpendingDonutChart data={processedData.groupedData} total={processedData.totalSpent} currency={trip.mainCurrency} timeLabel={timePeriodFullLabels[timePeriod]} />
                </Suspense>
            </div>

            <div className="flex justify-center items-center gap-2 p-1 bg-surface-variant rounded-full">
                {(['week', 'month', '6months', 'all'] as TimePeriod[]).map(period => (
                    <button
                        key={period}
                        onClick={() => setTimePeriod(period)}
                        className={`px-4 py-2 text-sm font-semibold rounded-full flex-1 transition-colors ${
                            timePeriod === period ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'
                        }`}
                    >
                        {timePeriodLabels[period]}
                    </button>
                ))}
            </div>
            
            <Suspense fallback={<ListSkeleton />}>
                <GroupedSpendingList data={processedData.groupedData} currency={trip.mainCurrency} groupBy={groupBy} setGroupBy={setGroupBy} />
            </Suspense>
        </div>
    );
};

export default Statistics;