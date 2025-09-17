import { UserData } from '../types';
import { DEFAULT_CATEGORIES } from '../constants';
import { db } from '../config';

// Detect if the app is running in a local/development environment
export const isDevelopmentEnvironment = (): boolean => {
    const hostname = window.location.hostname;
    const href = window.location.href;

    const developmentHostnames = ['localhost', '127.0.0.1'];
    // The user's provided URL indicates a specific development platform
    const developmentPatterns = ['.scf.usercontent.goog'];

    if (developmentHostnames.includes(hostname)) {
        return true;
    }

    if (developmentPatterns.some(pattern => href.includes(pattern))) {
        return true;
    }

    return false;
};


// --- LOCAL MOCK DATA ---
const getMockData = (password: string): UserData => {
    const MOCK_USER_DATA: UserData = {
        name: 'Utente Demo',
        email: 'demo@spendilog.com',
        dataviaggio: new Date().toISOString().split('T')[0],
        trips: [
            {
                id: 'mock-trip-1',
                name: 'Sud-est Asiatico',
                startDate: '2024-08-01T00:00:00.000Z',
                endDate: '2024-08-30T00:00:00.000Z',
                totalBudget: 3000,
                countries: ['Thailandia', 'Vietnam', 'Cambogia'],
                preferredCurrencies: ['EUR', 'THB', 'VND'],
                mainCurrency: 'EUR',
                expenses: [
                    { id: 'exp1', amount: 15, currency: 'EUR', category: 'Cibo', date: new Date(Date.now() - 2 * 86400000).toISOString() }, // 2 days ago
                    { id: 'exp2', amount: 1200, currency: 'THB', category: 'Alloggio', date: new Date(Date.now() - 2 * 86400000).toISOString() },
                    { id: 'exp3', amount: 500000, currency: 'VND', category: 'Attività', date: new Date(Date.now() - 1 * 86400000).toISOString() }, // yesterday
                    { id: 'exp4', amount: 25, currency: 'EUR', category: 'Trasporti', date: new Date().toISOString() }, // today
                ],
                color: '#3B82F6',
                enableCategoryBudgets: true,
                categoryBudgets: [
                    { categoryName: 'Cibo', amount: 1000 },
                    { categoryName: 'Alloggio', amount: 1200 },
                ],
                frequentExpenses: [
                    { id: 'freq-1', name: 'Pranzo', icon: '🍽️', category: 'Cibo', amount: 10 },
                    { id: 'freq-2', name: 'Grab Bike', icon: '🛵', category: 'Trasporti', amount: 2 },
                ]
            }
        ],
        categories: DEFAULT_CATEGORIES,
        defaultTripId: 'mock-trip-1',
    };
    
    try {
        const storedData = localStorage.getItem(`mock_data_${password}`);
        if (storedData) {
            return JSON.parse(storedData);
        }
    } catch (e) {
        console.error("Failed to parse mock data from localStorage", e);
    }
    
    return MOCK_USER_DATA;
};

// --- FIRESTORE DATA ---
const fetchFirestoreData = async (password: string): Promise<UserData | null> => {
    try {
        // FIX: Switched to Firebase v8 syntax for fetching a document.
        const docRef = db.collection("users").doc(password);
        const docSnap = await docRef.get();

        // FIX: Switched to Firebase v8 syntax for checking document existence (`.exists` is a property).
        if (docSnap.exists) {
            return docSnap.data() as UserData;
        } else {
            console.log("No such document!");
            return null;
        }
    } catch (error) {
        console.error("Error fetching data from Firestore:", error);
        throw new Error('Failed to fetch data from Firestore. Check your configuration and permissions.');
    }
}

const saveFirestoreData = async (password: string, data: UserData): Promise<void> => {
     try {
        // FIX: Switched to Firebase v8 syntax for setting a document.
        await db.collection("users").doc(password).set(data);
    } catch (error) {
        console.error("Error saving data to Firestore:", error);
        throw new Error('Failed to save data to Firestore. Check your configuration and permissions.');
    }
}

// --- UNIFIED DATA SERVICE ---
export const fetchData = async (password: string): Promise<UserData | null> => {
    console.log(`[DEBUG] Data fetch initiated from: ${window.location.href}`);
    if (isDevelopmentEnvironment()) {
        console.warn("Ambiente di sviluppo rilevato. Verranno usati dati di prova locali.");
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
        return getMockData(password);
    } else {
        return await fetchFirestoreData(password);
    }
};

export const saveData = async (password: string, data: UserData): Promise<void> => {
    console.log(`[DEBUG] Data save initiated from: ${window.location.href}`);
    if (isDevelopmentEnvironment()) {
        console.warn("Ambiente di sviluppo rilevato. Salvataggio locale dei dati di prova.");
        try {
            localStorage.setItem(`mock_data_${password}`, JSON.stringify(data));
        } catch (e) {
            console.error("Failed to save mock data to localStorage", e);
        }
    } else {
        await saveFirestoreData(password, data);
    }
};
