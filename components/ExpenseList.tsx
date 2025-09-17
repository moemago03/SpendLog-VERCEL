import React, { useState } from 'react';
import { Trip, Expense } from '../types';
import { useData } from '../context/DataContext';
import { useCurrencyConverter } from '../hooks/useCurrencyConverter';

interface ExpenseListProps {
    expenses: Expense[];
    trip: Trip;
    onEditExpense: (expense: Expense) => void;
}

const ExpenseItem: React.FC<{ 
    expense: Expense; 
    onEdit: () => void; 
    onDelete: () => void; 
    categoryIcon: string; 
    isSelected: boolean;
    onSelect: () => void;
    style?: React.CSSProperties;
}> = ({ expense, onEdit, onDelete, categoryIcon, isSelected, onSelect, style }) => {
    const { formatCurrency, convert } = useCurrencyConverter();
    const mainCurrency = 'EUR'; // Assuming EUR as the main currency for conversion display
    
    return (
        <li 
            className={`relative p-3 rounded-3xl cursor-pointer transition-all duration-300 overflow-hidden bg-surface-variant animate-slide-in-up`}
            style={style}
            onClick={onSelect}
            aria-selected={isSelected}
        >
            {/* Main content area */}
            <div className={`flex items-center justify-between w-full transition-transform duration-300 ${isSelected ? '-translate-x-28' : 'translate-x-0'}`}>
                <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 flex-shrink-0 bg-surface text-on-secondary-container text-2xl rounded-2xl flex items-center justify-center">
                        {categoryIcon}
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-on-surface truncate">{expense.category}</p>
                        <p className="text-sm text-on-surface-variant">{new Date(expense.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                </div>
                <div className="text-right ml-2 flex-shrink-0">
                    <p className="font-semibold text-on-surface">{formatCurrency(expense.amount, expense.currency)}</p>
                    {expense.currency !== mainCurrency && (
                        <p className="text-xs text-on-surface-variant -mt-0.5">
                            {`≈ ${formatCurrency(convert(expense.amount, expense.currency, mainCurrency), mainCurrency)}`}
                        </p>
                    )}
                </div>
            </div>

            {/* Actions Panel - slides in from the right */}
            <div className={`absolute top-0 right-0 h-full flex items-center bg-surface-variant transition-opacity duration-300 ${isSelected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                 <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(); }} 
                    className="flex items-center justify-center h-full w-14 text-on-surface-variant hover:bg-outline/20 transition-colors" 
                    aria-label="Modifica spesa"
                    disabled={!isSelected}
                    tabIndex={isSelected ? 0 : -1}
                >
                    <span className="material-symbols-outlined text-lg">edit</span>
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                    className="flex items-center justify-center h-full w-14 text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors" 
                    aria-label="Elimina spesa"
                    disabled={!isSelected}
                    tabIndex={isSelected ? 0 : -1}
                >
                    <span className="material-symbols-outlined text-lg">delete</span>
                </button>
            </div>
        </li>
    );
}

const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, trip, onEditExpense }) => {
    const { deleteExpense, data: { categories } } = useData();
    const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);

    const handleSelectExpense = (expenseId: string) => {
        setSelectedExpenseId(prevId => (prevId === expenseId ? null : expenseId));
    };

    const handleDelete = (expenseId: string) => {
        if (window.confirm("Sei sicuro di voler eliminare questa spesa?")) {
            deleteExpense(trip.id, expenseId);
            setSelectedExpenseId(null); // Close the panel after deletion
        }
    };

    const getCategoryIcon = (categoryName: string) => {
        return categories.find(c => c.name === categoryName)?.icon || '💸';
    }
    
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-on-surface">
                    Spese Recenti
                </h2>
            </div>
            {expenses.length > 0 ? (
                <ul className="space-y-3">
                    {expenses.map((expense, index) => (
                        <ExpenseItem 
                            key={expense.id} 
                            expense={expense} 
                            onEdit={() => onEditExpense(expense)}
                            onDelete={() => handleDelete(expense.id)}
                            categoryIcon={getCategoryIcon(expense.category)}
                            isSelected={selectedExpenseId === expense.id}
                            onSelect={() => handleSelectExpense(expense.id)}
                            style={{ animationDelay: `${index * 50}ms` }}
                        />
                    ))}
                </ul>
            ) : (
                <div className="text-center py-10 px-4 bg-surface-variant rounded-3xl">
                    <p className="text-on-surface-variant">Nessuna spesa trovata.</p>
                    <p className="text-sm text-on-surface-variant/80">Aggiungine una con il pulsante `+`!</p>
                </div>
            )}
        </div>
    );
};

export default ExpenseList;