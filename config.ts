// FIX: Updated Firebase imports to use the v9 compatibility library.
// This allows using the older Firebase v8 syntax (like firebase.initializeApp)
// with a newer version of the Firebase SDK installed.
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

// Incolla qui la configurazione del tuo progetto Firebase
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Inizializza Firebase
firebase.initializeApp(firebaseConfig);

// Esporta l'istanza di Firestore
export const db = firebase.firestore();