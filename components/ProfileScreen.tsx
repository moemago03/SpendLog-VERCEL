
import React, { useState, useMemo } from 'react';
import { Trip } from '../types';
import CategoryManager from './CategoryManager';
import FrequentExpenseManager from './FrequentExpenseManager';
import ThemeToggle from './ThemeToggle';
import TripManager from './TripManager';

interface ProfileScreenProps {
    trips: Trip[];
    activeTripId: string | null;
    onSetDefaultTrip: (tripId: string) => void;
    onLogout: () => void;
}

const SettingsItem: React.FC<{
    label: string;
    icon: string;
    onClick?: () => void;
    children?: React.ReactNode;
}> = ({ label, icon, onClick, children }) => (
    <div 
        onClick={onClick} 
        className={`flex justify-between items-center p-4 ${onClick ? 'cursor-pointer hover:bg-on-surface/5' : ''}`}
    >
        <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-on-surface-variant">{icon}</span>
            <span className="text-on-surface font-medium">{label}</span>
        </div>
        {children || <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>}
    </div>
);


const ProfileScreen: React.FC<ProfileScreenProps> = ({ trips, activeTripId, onSetDefaultTrip, onLogout }) => {
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
    const [isFrequentExpenseManagerOpen, setIsFrequentExpenseManagerOpen] = useState(false);
    const [isTripManagerOpen, setIsTripManagerOpen] = useState(false);
    
    const activeTrip = trips.find(t => t.id === activeTripId) || null;

    const sortedTrips = useMemo(() => {
        if (!trips) return [];
        return [...trips].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    }, [trips]);

    return (
        <>
            <div className="p-4 sm:p-6 lg:p-8">
                <header className="py-8">
                    <h1 className="text-3xl font-bold text-on-background text-center">Profilo</h1>
                </header>
                
                {sortedTrips.length > 0 && (
                     <section className="mb-8 max-w-xl mx-auto">
                        <label htmlFor="trip-select" className="block text-lg font-semibold text-on-surface mb-3 px-2">Viaggio Predefinito</label>
                        <select
                            id="trip-select"
                            value={activeTripId || 'none'}
                            onChange={(e) => onSetDefaultTrip(e.target.value)}
                            className="w-full bg-surface-variant border-transparent rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' class='bi bi-chevron-down' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 1rem center',
                                backgroundSize: '1em'
                            }}
                        >
                            <option value="none">Nessun viaggio predefinito</option>
                            {sortedTrips.map(trip => (
                                <option key={trip.id} value={trip.id}>
                                    {trip.name}
                                </option>
                            ))}
                        </select>
                    </section>
                )}
                
                {trips.length === 0 && (
                     <div className="text-center py-8 px-6 bg-surface-variant/50 rounded-2xl max-w-xl mx-auto my-8">
                        <span className="material-symbols-outlined text-5xl text-on-surface-variant/50">luggage</span>
                        <h2 className="text-xl font-semibold text-on-surface-variant mt-4">Nessun viaggio trovato</h2>
                        <p className="mt-2 text-on-surface-variant">Crea il tuo primo viaggio per iniziare.</p>
                         <button onClick={() => setIsTripManagerOpen(true)} className="mt-6 px-6 py-2.5 bg-primary text-on-primary font-medium text-sm rounded-full shadow-sm hover:shadow-md">
                            Crea un Viaggio
                        </button>
                    </div>
                )}

                <main className="max-w-xl mx-auto">
                     <div className="bg-surface-variant/50 rounded-2xl divide-y divide-outline/30 overflow-hidden">
                        <SettingsItem icon="luggage" label="Gestione Viaggi" onClick={() => setIsTripManagerOpen(true)} />
                        <SettingsItem icon="category" label="Gestisci Categorie" onClick={() => setIsCategoryManagerOpen(true)} />
                        {activeTrip && (
                            <SettingsItem icon="star" label="Spese Frequenti" onClick={() => setIsFrequentExpenseManagerOpen(true)} />
                        )}
                        <SettingsItem icon="contrast" label="Tema">
                            <ThemeToggle />
                        </SettingsItem>
                        <SettingsItem icon="logout" label="Logout" onClick={onLogout} />
                    </div>
                </main>
            </div>
            
            {isTripManagerOpen && (
                <TripManager onClose={() => setIsTripManagerOpen(false)} />
            )}
            {isCategoryManagerOpen && (
                <CategoryManager onClose={() => setIsCategoryManagerOpen(false)} />
            )}
            {isFrequentExpenseManagerOpen && activeTrip && (
                <FrequentExpenseManager 
                    activeTrip={activeTrip}
                    onClose={() => setIsFrequentExpenseManagerOpen(false)} 
                />
            )}
        </>
    );
};

export default ProfileScreen;
