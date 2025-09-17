import { APPS_SCRIPT_URL } from '../config';
import { UserData } from '../types';
import { DEFAULT_CATEGORIES } from '../constants';

const PLACEHOLDER_URL = "INCOLLA_QUI_IL_TUO_URL_DELLO_SCRIPT_GOOGLE";

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


/**
 * Fetches user data from a Google Apps Script web app.
 * @param password The user's identifier.
 * @returns The user's data or null if not found.
 */
export const fetchData = async (password: string): Promise<UserData | null> => {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === PLACEHOLDER_URL) {
        console.warn("URL non configurato. Verranno usati dati di prova locali.");
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
        return getMockData(password);
    }

    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain', // Apps Script often uses text/plain for POST
            },
            body: JSON.stringify({ action: 'getData', password }),
            mode: 'cors',
        });

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.status === 'success') {
            // Data from the sheet is often double-stringified
            const parsedData = JSON.parse(result.data);
            return parsedData as UserData;
        } else if (result.message === 'No data found') {
            return null; // This is a valid case, not an error
        } else {
            throw new Error(result.message || 'Unknown error from Google Sheet service');
        }
    } catch (e: any) {
        console.error("Error fetching data from Google Sheet:", e);
        throw new Error('Failed to fetch data from Google Sheet. Check the URL and script permissions.');
    }
};

/**
 * Saves user data to a Google Sheet via an Apps Script web app.
 * @param password The user's identifier.
 * @param data The user data to save.
 */
export const saveData = async (password: string, data: UserData): Promise<void> => {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === PLACEHOLDER_URL) {
        console.warn("URL non configurato. Salvataggio locale dei dati di prova.");
        try {
            localStorage.setItem(`mock_data_${password}`, JSON.stringify(data));
        } catch (e) {
            console.error("Failed to save mock data to localStorage", e);
        }
        return;
    }

    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify({
                action: 'saveData',
                password,
                // Stringify the data payload as the script expects a string
                data: JSON.stringify(data)
            }),
            mode: 'cors',
        });

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.status !== 'success') {
            throw new Error(result.message || 'Failed to save data to Google Sheet');
        }
    } catch (e: any) {
        console.error("Error saving data to Google Sheet:", e);
        throw new Error('Failed to save data. Check the script URL and network connection.');
    }
};