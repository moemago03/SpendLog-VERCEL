import { db } from '../config';
import { UserData } from '../types';
// FIX: Removed Firebase v9 modular imports as the codebase is being updated to use the v8 API syntax.
// import { doc, getDoc, setDoc } from "firebase/firestore";

/**
 * Fetches user data from a Firestore document.
 * @param password The user's identifier, used as the document ID.
 * @returns The user's data or null if not found.
 */
export const fetchData = async (password: string): Promise<UserData | null> => {
    if (!password) {
        throw new Error("User identifier is required.");
    }

    try {
        // FIX: Switched to Firebase v8 syntax to get a document reference and fetch the document.
        const userDocRef = db.collection("users").doc(password);
        const docSnap = await userDocRef.get();

        // FIX: Switched to Firebase v8's `.exists` property instead of the v9 `.exists()` method.
        if (docSnap.exists) {
            const data = docSnap.data();
            // Merge fetched data with defaults to ensure all fields are present
            return {
                name: '',
                email: '',
                dataviaggio: '',
                trips: [],
                categories: [],
                ...data,
                defaultTripId: data.defaultTripId || undefined,
            } as UserData;
        } else {
            console.log("No such document for user:", password);
            return null;
        }
    } catch (e) {
        console.error("Error fetching data from Firestore:", e);
        throw new Error('Failed to fetch data from Firestore. Check your configuration and permissions.');
    }
};

/**
 * Saves user data to a Firestore document.
 * @param password The user's identifier, used as the document ID.
 * @param data The user data to save.
 */
export const saveData = async (password: string, data: UserData): Promise<void> => {
    if (!password) {
        console.error("User identifier is required for saving data.");
        return;
    }

    try {
        // FIX: Switched to Firebase v8 syntax to get a document reference.
        const userDocRef = db.collection("users").doc(password);
        // Create a clean data object to avoid saving 'undefined' to Firestore
        const dataToSave = {
            ...data,
            defaultTripId: data.defaultTripId || null // Store as null instead of undefined
        };
        // FIX: Switched to Firebase v8 syntax to save the document.
        await userDocRef.set(dataToSave);
    } catch (e: any) {
        console.error("Error saving data to Firestore:", e);
        throw new Error('Failed to save data. Check your Firestore configuration and network connection.');
    }
};