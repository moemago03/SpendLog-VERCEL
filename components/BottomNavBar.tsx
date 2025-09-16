import React from 'react';
import { AppView } from '../App';


interface BottomNavBarProps {
    activeView: AppView;
    onNavigate: (view: AppView) => void;
    isTripActive: boolean;
}

const NavItem: React.FC<{
    label: string;
    icon: string;
    isActive: boolean;
    isDisabled?: boolean;
    onClick: () => void;
}> = ({ label, icon, isActive, isDisabled = false, onClick }) => {
    const activeText = 'text-on-primary';
    const activeIcon = 'text-primary';
    const inactiveClasses = 'text-on-surface-variant';

    return (
        <button
            onClick={onClick}
            disabled={isDisabled}
            className={`flex-1 flex flex-col items-center justify-center pt-2 pb-1 gap-1 transition-colors h-full relative ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-surface-variant/50'}`}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
        >
            <div className={`relative w-16 h-8 flex items-center justify-center rounded-full transition-all duration-300 ${isActive ? 'bg-primary' : ''}`}>
                 <span className={`material-symbols-outlined text-2xl transition-colors ${isActive ? 'text-on-primary' : inactiveClasses}`}>{icon}</span>
            </div>
            <span className={`text-xs font-medium transition-colors ${isActive ? 'text-primary' : inactiveClasses}`}>{label}</span>
        </button>
    );
};


const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeView, onNavigate, isTripActive }) => {
    const navItems = [
        { id: 'summary', label: 'Riepilogo', icon: 'dashboard', requiresTrip: true },
        { id: 'stats', label: 'Statistiche', icon: 'bar_chart', requiresTrip: true },
        { id: 'currency', label: 'Convertitore', icon: 'currency_exchange', requiresTrip: true },
        { id: 'profile', label: 'Profilo', icon: 'person', requiresTrip: false },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-20 bg-surface/80 backdrop-blur-lg border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-30 flex justify-around">
            {navItems.map(item => (
                <NavItem
                    key={item.id}
                    label={item.label}
                    icon={item.icon}
                    isActive={activeView === item.id}
                    isDisabled={item.requiresTrip && !isTripActive}
                    onClick={() => onNavigate(item.id as AppView)}
                />
            ))}
        </nav>
    );
};

export default BottomNavBar;