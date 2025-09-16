import React, { useMemo } from 'react';
import { Trip, Expense } from '../types';
import { useCurrencyConverter } from '../hooks/useCurrencyConverter';
import { BarChart, Bar, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, ReferenceLine } from 'recharts';

interface AdvancedBudgetChartProps {
    expenses: Expense[];
    trip: Trip;
    selectedDate: string | null;
    onDaySelect: (date: string | null) => void;
}

const CustomTooltip = ({ active, payload, trip, formatCurrency }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        if (!data.fullDate) return null;
        
        return (
            <div className="bg-surface p-3 rounded-xl border border-outline shadow-lg" role="tooltip">
                <p className="font-semibold text-on-surface">{data.fullDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                {payload.map((pld: any) => (
                    // Don't show tooltip for zero-value data points
                    pld.value > 0 &&
                    <p key={pld.dataKey} style={{ color: pld.stroke || pld.fill }} className="text-sm">
                        {`${pld.name}: ${formatCurrency(pld.value, trip.mainCurrency)}`}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};


const AdvancedBudgetChart: React.FC<AdvancedBudgetChartProps> = ({ expenses, trip, selectedDate, onDaySelect }) => {
    const { convert, formatCurrency } = useCurrencyConverter();

    const { dailyChartData, trendChartData, idealDailyBurn } = useMemo(() => {
        if (!trip) return { dailyChartData: [], trendChartData: [], idealDailyBurn: 0 };

        const tripStart = new Date(trip.startDate);
        const tripEnd = new Date(trip.endDate);
        const totalTripDuration = Math.max(1, (tripEnd.getTime() - tripStart.getTime()) / (1000 * 3600 * 24) + 1);
        const dailyBudget = trip.totalBudget > 0 ? trip.totalBudget / totalTripDuration : 0;

        const dailySpending = new Map<string, number>();
        expenses.forEach(expense => {
            const date = new Date(expense.date).toISOString().split('T')[0];
            const amountInMain = convert(expense.amount, expense.currency, trip.mainCurrency);
            dailySpending.set(date, (dailySpending.get(date) || 0) + amountInMain);
        });

        const dailyData = [];
        const trendData = [];
        let cumulativeSpent = 0;
        let daysElapsed = 0;
        let currentDate = new Date(tripStart);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        const lastDate = today < tripEnd ? today : tripEnd;

        if (lastDate >= tripStart) {
            while (currentDate <= lastDate) {
                daysElapsed++;
                const dateStr = currentDate.toISOString().split('T')[0];
                const spentToday = dailySpending.get(dateStr) || 0;
                cumulativeSpent += spentToday;
                const shortDate = currentDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });

                dailyData.push({
                    date: dateStr,
                    shortDate: shortDate,
                    fullDate: new Date(currentDate),
                    'Spesa Giornaliera': spentToday,
                });

                trendData.push({
                    date: shortDate,
                    fullDate: new Date(currentDate),
                    'Spesa Reale': cumulativeSpent,
                    'Spesa Ideale': dailyBudget * daysElapsed,
                });
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
        
        return { dailyChartData: dailyData, trendChartData: trendData, idealDailyBurn: dailyBudget };
    }, [expenses, trip, convert]);

    const handleBarClick = (data: any) => {
        if (data && data.date) {
            if (data.date === selectedDate) {
                onDaySelect(null); // Deselect
            } else {
                onDaySelect(data.date);
            }
        }
    };

    if (expenses.length === 0) {
        return (
            <div className="bg-surface p-4 rounded-3xl shadow-sm">
                <h2 className="text-xl font-semibold text-on-surface mb-4">Analisi Spese</h2>
                <div className="flex items-center justify-center h-64 text-on-surface-variant text-center">
                    <p>Nessuna spesa nel periodo selezionato per mostrare i grafici.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-surface p-4 rounded-3xl shadow-sm">
                <h2 className="text-xl font-semibold text-on-surface mb-4">Spesa Giornaliera</h2>
                <div className="w-full h-64" aria-label="Grafico a barre della spesa giornaliera">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }} onClick={handleBarClick}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--md-sys-color-surface-variant)" />
                            <XAxis dataKey="shortDate" tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 12 }} />
                            <YAxis tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip trip={trip} formatCurrency={formatCurrency} />} cursor={{ fill: 'var(--md-sys-color-surface-variant)' }} />
                            <ReferenceLine y={idealDailyBurn} label={{ value: 'Budget Medio', position: 'insideTopLeft', fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 10 }} stroke="var(--md-sys-color-tertiary)" strokeDasharray="4 4" />
                            <Bar dataKey="Spesa Giornaliera" radius={[4, 4, 0, 0]}>
                                {dailyChartData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        cursor="pointer"
                                        fill={selectedDate === entry.date ? 'var(--md-sys-color-tertiary)' : 'var(--md-sys-color-primary)'} 
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-surface p-6 rounded-3xl shadow-sm">
                <h2 className="text-xl font-semibold text-on-surface mb-4">Andamento Budget</h2>
                 <div className="w-full h-64" aria-label="Grafico andamento budget">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={trendChartData}
                            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--md-sys-color-surface-variant)" />
                            <XAxis dataKey="date" tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 12 }} />
                            <YAxis 
                                tickFormatter={(value) => new Intl.NumberFormat('it-IT', { notation: 'compact', compactDisplay: 'short' }).format(value)} 
                                tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 12 }} 
                                domain={[0, 'dataMax']} 
                                width={50}
                            />
                            <Tooltip content={<CustomTooltip trip={trip} formatCurrency={formatCurrency} />} />
                            <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{fontSize: "14px", paddingBottom: "10px"}} />
                            <defs>
                                <linearGradient id="realSpendingGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--md-sys-color-primary)" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="var(--md-sys-color-primary)" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="Spesa Reale" stroke="var(--md-sys-color-primary)" fill="url(#realSpendingGradient)" strokeWidth={2.5} name="Spesa Reale" />
                            <Line type="monotone" dataKey="Spesa Ideale" stroke="var(--md-sys-color-tertiary)" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Spesa Ideale" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default AdvancedBudgetChart;