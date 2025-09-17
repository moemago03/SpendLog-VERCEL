// Import the functions you need from the SDKs you need
// FIX: Switched to Firebase v9 compatibility imports to support the v8 namespaced API syntax used in the app.
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCN-ocf0Spoe_Wk8q_q08RJY1cHv67ymHY",
  authDomain: "spendlog-cafa2.firebaseapp.com",
  projectId: "spendlog-cafa2",
  storageBucket: "spendlog-cafa2.firebasestorage.app",
  messagingSenderId: "859713826525",
  appId: "1:859713826525:web:eaa292602a07d7daafb534"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Initialize Cloud Firestore and get a reference to the service
export const db = firebase.firestore();