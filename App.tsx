import React, { useState, useEffect } from 'react';
import { DataProvider, useData } from './context/DataContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import ProfileScreen from './components/ProfileScreen';
import BottomNavBar from './components/BottomNavBar';
import LoadingScreen from './components/LoadingScreen';

export type AppView = 'summary' | 'stats' | 'currency' | 'profile';

const AppContent: React.FC<{
    onLogout: () => void;
}> = ({ onLogout }) => {
    const [activeTripId, setActiveTripId] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<AppView>('summary');
    const { data, loading, setDefaultTrip } = useData();

    useEffect(() => {
        // This effect handles the initial loading of the default trip.
        // It runs only when the data loading state changes.
        if (loading || !data) {
            return; // Wait for data to be loaded.
        }

        const defaultTripId = data.defaultTripId;

        // Check if the stored default trip ID is valid and exists in the loaded data.
        if (defaultTripId && data.trips.some(t => t.id === defaultTripId)) {
            // A valid default trip was found. Set it as the active trip and show the summary view.
            setActiveTripId(defaultTripId);
            setActiveView('summary');
        } else {
            // No default trip is set, or the stored one is invalid (e.g., deleted).
            // Redirect to the profile screen for the user to select a trip.
            setActiveTripId(null);
            setActiveView('profile');
        }
    }, [data, loading]); // Dependencies ensure this runs once after data is loaded.


    const handleSetDefaultTrip = (tripId: string) => {
        const newDefaultTripId = tripId === 'none' ? null : tripId;
        setDefaultTrip(newDefaultTripId);

        if (tripId === 'none') {
             setActiveTripId(null);
             setActiveView('profile');
        } else {
            setActiveTripId(tripId);
            setActiveView('summary'); // Switch to summary for the new default trip
        }
    };
    
    const handleNavigation = (view: AppView) => {
        setActiveView(view);
    };

    if (loading) {
        return <LoadingScreen />;
    }
    
    const activeTrip = data.trips.find(t => t.id === activeTripId) || null;

    const renderMainContent = () => {
        if (activeView === 'profile') {
             return (
                <ProfileScreen 
                    trips={data.trips}
                    activeTripId={activeTripId}
                    onSetDefaultTrip={handleSetDefaultTrip}
                    onLogout={onLogout}
                />
            );
        }

        // FIX: Removed redundant `activeView !== 'profile'` check. The preceding `if` statement
        // already handles the 'profile' case, so TypeScript correctly narrows the type of
        // `activeView` at this point, making the check unnecessary and causing a type error.
        if (activeTrip && activeTripId) {
             return (
                <Dashboard 
                    key={activeTripId}
                    activeTripId={activeTripId}
                    currentView={activeView}
                />
            );
        }

        // Fallback: If no active trip, but view is not profile, redirect to profile
        // This can happen if the default trip is deleted.
        return (
             <ProfileScreen 
                trips={data.trips}
                activeTripId={null}
                onSetDefaultTrip={handleSetDefaultTrip}
                onLogout={onLogout}
            />
        );
    };
    
    return (
        <div className="min-h-screen bg-background text-on-background font-sans">
            <main className="pb-20">
                 {renderMainContent()}
            </main>
            <BottomNavBar 
                activeView={activeView}
                onNavigate={handleNavigation}
                isTripActive={!!activeTrip}
            />
        </div>
    );
};


const App: React.FC = () => {
    const [user, setUser] = useState<string | null>(localStorage.getItem('vsc_user'));

    const handleLogin = (password: string) => {
        localStorage.setItem('vsc_user', password);
        setUser(password);
    };
    
    const handleLogout = () => {
        localStorage.removeItem('vsc_user');
        setUser(null);
    }
    
    if (!user) {
        return <LoginScreen onLogin={handleLogin} />;
    }
    
    return (
        <ThemeProvider>
            <DataProvider>
                <CurrencyProvider>
                    <AppContent onLogout={handleLogout} />
                </CurrencyProvider>
            </DataProvider>
        </ThemeProvider>
    );
};

export default App;