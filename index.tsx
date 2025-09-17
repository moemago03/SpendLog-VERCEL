import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Service Worker Registration for PWA
const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    const swContent = `
      const CACHE_NAME = 'spendilog-cache-v2';
      // Add all CDN links and essential paths to the cache list
      const urlsToCache = [
        '/',
        '/index.html',
        'https://cdn.tailwindcss.com',
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
        'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block',
        'https://aistudiocdn.com/react@^19.1.1',
        'https://aistudiocdn.com/react-dom@^19.1.1/',
        'https://aistudiocdn.com/recharts@^3.2.0',
        'https://aistudiocdn.com/@google/genai@^1.19.0'
      ];

      self.addEventListener('install', event => {
        event.waitUntil(
          caches.open(CACHE_NAME)
            .then(cache => {
              console.log('Opened cache');
              // Use addAll with individual requests to handle opaque responses from CDNs more gracefully
              const promises = urlsToCache.map(url => {
                return cache.add(new Request(url, { mode: 'no-cors' })).catch(err => {
                  console.warn('Failed to cache:', url, err);
                });
              });
              return Promise.all(promises);
            })
        );
      });

      self.addEventListener('fetch', event => {
        event.respondWith(
          caches.match(event.request)
            .then(response => {
              // Cache hit - return response
              if (response) {
                return response;
              }
              // Not in cache - fetch from network
              return fetch(event.request).then(
                networkResponse => {
                  // Check if we received a valid response
                  if (!networkResponse || networkResponse.status !== 200) {
                     // For CDN scripts, a type 'opaque' is expected and okay
                     if(networkResponse.type !== 'opaque') {
                        return networkResponse;
                     }
                  }

                  // IMPORTANT: Clone the response. A response is a stream
                  // and because we want the browser to consume the response
                  // as well as the cache consuming the response, we need
                  // to clone it so we have two streams.
                  const responseToCache = networkResponse.clone();

                  caches.open(CACHE_NAME)
                    .then(cache => {
                      cache.put(event.request, responseToCache);
                    });

                  return networkResponse;
                }
              ).catch(err => {
                console.error('Fetch failed:', err);
                // You could return a custom offline page here if you had one cached.
              });
            })
        );
      });

      // Clean up old caches
      self.addEventListener('activate', event => {
        const cacheWhitelist = [CACHE_NAME];
        event.waitUntil(
          caches.keys().then(cacheNames => {
            return Promise.all(
              cacheNames.map(cacheName => {
                if (cacheWhitelist.indexOf(cacheName) === -1) {
                  return caches.delete(cacheName);
                }
              })
            );
          })
        );
      });
    `;
    const blob = new Blob([swContent], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(blob);

    window.addEventListener('load', () => {
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
