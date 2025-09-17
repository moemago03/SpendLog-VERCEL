import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Service Worker Registration for PWA
const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // FIX: Construct an absolute URL for the service worker to prevent cross-origin errors.
        // This ensures the SW is registered from the same origin as the app, even in complex
        // hosting environments.
        const swUrl = `${window.location.origin}/sw.js`;
        navigator.serviceWorker.register(swUrl)
            .then(registration => console.log('ServiceWorker registration successful with scope: ', registration.scope))
            .catch(err => console.log('ServiceWorker registration failed: ', err));
    });
  }
};

registerServiceWorker();

const container = document.getElementById('root');
if (!container) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
