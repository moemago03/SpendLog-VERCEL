import React, { useState, useEffect, useCallback, memo } from 'react';
import { DataProvider, useData } from './context/DataContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import NotificationContainer from './components/NotificationContainer';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import ProfileScreen from './components/ProfileScreen';
import BottomNavBar from './components/BottomNavBar';
import LoadingScreen from './components/LoadingScreen';

export type AppView = 'summary' | 'stats' | 'currency' | 'profile';

const viewIndices: { [key in AppView]: number } = {
    summary: 0,
    stats: 1,
    currency: 2,
    profile: 3,
};

const AppContent: React.FC<{
    onLogout: () => void;
    isInstallable: boolean;
    onInstall: () => void;
}> = memo(({ onLogout, isInstallable, onInstall }) => {
    const [activeTripId, setActiveTripId] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<AppView>('summary');
    const [animationClass, setAnimationClass] = useState('animate-view-transition');
    const { data, loading, setDefaultTrip } = useData();

    const changeView = useCallback((newView: AppView, isSlide: boolean) => {
        setActiveView(currentActiveView => {
            if (newView === currentActiveView) {
                return currentActiveView;
            }

            if (isSlide) {
                const currentIndex = viewIndices[currentActiveView];
                const newIndex = viewIndices[newView];
                
                if (newIndex > currentIndex) {
                    setAnimationClass('animate-slide-in-right');
                } else { // newIndex < currentIndex
                    setAnimationClass('animate-slide-in-left');
                }
            } else {
                setAnimationClass('animate-view-transition');
            }
            return newView;
        });
    }, []);

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
            changeView('summary', false);
        } else {
            // No default trip is set, or the stored one is invalid (e.g., deleted).
            // Redirect to the profile screen for the user to select a trip.
            setActiveTripId(null);
            changeView('profile', false);
        }
    }, [data, loading, changeView]); // Dependencies ensure this runs once after data is loaded.

    const activeTrip = data?.trips.find(t => t.id === activeTripId) || null;

    useEffect(() => {
        const styleElement = document.getElementById('dynamic-trip-theme');
        if (!styleElement) return;

        if (activeTrip && activeTrip.color) {
            const isColorLight = (hex: string) => {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                return yiq >= 128;
            };

            const primaryColor = activeTrip.color;
            const onPrimaryColor = isColorLight(primaryColor) ? '#001A40' : '#FFFFFF';

            styleElement.innerHTML = `
                :root {
                    --trip-primary: ${primaryColor};
                    --trip-on-primary: ${onPrimaryColor};
                }
            `;
        } else {
            // Reset to default theme colors when no trip is active or trip has no color
            styleElement.innerHTML = `
                :root {
                    --trip-primary: var(--color-primary);
                    --trip-on-primary: var(--color-on-primary);
                }
            `;
        }
    }, [activeTrip]);


    const handleSetDefaultTrip = useCallback((tripId: string) => {
        const newDefaultTripId = tripId === 'none' ? null : tripId;
        setDefaultTrip(newDefaultTripId);

        if (tripId === 'none') {
             setActiveTripId(null);
             changeView('profile', false);
        } else {
            setActiveTripId(tripId);
            changeView('summary', false); // Switch to summary for the new default trip
        }
    }, [setDefaultTrip, changeView]);
    
    const handleNavigation = useCallback((view: AppView) => {
        changeView(view, true);
    }, [changeView]);

    if (loading) {
        return <LoadingScreen />;
    }
    
    const renderMainContent = () => {
        if (activeView === 'profile') {
             return (
                <ProfileScreen 
                    trips={data.trips}
                    activeTripId={activeTripId}
                    onSetDefaultTrip={handleSetDefaultTrip}
                    onLogout={onLogout}
                    isInstallable={isInstallable}
                    onInstall={onInstall}
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
                isInstallable={isInstallable}
                onInstall={onInstall}
            />
        );
    };
    
    return (
        <div className="min-h-screen bg-background text-on-background font-sans">
            <main className="pb-20 overflow-x-hidden">
                 <div key={activeView + activeTripId} className={animationClass}>
                    {renderMainContent()}
                </div>
            </main>
            <BottomNavBar 
                activeView={activeView}
                onNavigate={handleNavigation}
                isTripActive={!!activeTrip}
            />
        </div>
    );
});


const App: React.FC = () => {
    // --- TEMPORARY CHANGE FOR TESTING ---
    // Automatically log in as user "0" to bypass the login screen.
    // Original line: const [user, setUser] = useState<string | null>(localStorage.getItem('vsc_user'));
    const [user, setUser] = useState<string | null>('0');
    const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setInstallPrompt(e);
            // Update UI to show the install button
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);
    
    const handleInstallClick = useCallback(async () => {
        if (!installPrompt) return;
        
        // Show the install prompt
        (installPrompt as any).prompt();
        
        // Wait for the user to respond to the prompt
        const { outcome } = await (installPrompt as any).userChoice;
        
        // We've used the prompt, and can't use it again, so clear it
        setIsInstallable(false);
        setInstallPrompt(null);
        
        console.log(`User response to the install prompt: ${outcome}`);
    }, [installPrompt]);

    const handleLogin = (password: string) => {
        localStorage.setItem('vsc_user', password);
        setUser(password);
    };
    
    const handleLogout = useCallback(() => {
        localStorage.removeItem('vsc_user');
        setUser(null);
    }, []);
    
    if (!user) {
        return <LoginScreen onLogin={handleLogin} />;
    }
    
    return (
        <ThemeProvider>
            <NotificationProvider>
                <DataProvider user={user}>
                    <CurrencyProvider>
                        <AppContent 
                            onLogout={handleLogout} 
                            isInstallable={isInstallable}
                            onInstall={handleInstallClick}
                        />
                    </CurrencyProvider>
                </DataProvider>
                <NotificationContainer />
            </NotificationProvider>
        </ThemeProvider>
    );
};

export default App;