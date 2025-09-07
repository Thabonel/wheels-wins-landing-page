import React from "react";
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeSentry } from './lib/sentry'
import { performanceMonitor } from './utils/performanceMonitor'

// Initialize Sentry as early as possible
initializeSentry();

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  // Log metrics after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      performanceMonitor.reportToAnalytics();
    }, 3000);
  });

  // Register service worker for PWA functionality
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('🔧 Service Worker registered successfully:', registration.scope);
        
        // Listen for service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            console.log('🔄 New service worker installing...');
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('✨ New content is available! Refresh to update.');
                // Could show a toast notification here for manual refresh
              }
            });
          }
        });
        
        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', (event) => {
          const { type, requestId } = event.data || {};
          if (type === 'SYNC_SUCCESS') {
            console.log('📤 Background sync completed:', requestId);
          }
        });
        
      } catch (error) {
        console.warn('⚠️ Service Worker registration failed:', error);
      }
    });
  } else {
    console.warn('⚠️ Service Worker not supported in this browser');
  }
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
