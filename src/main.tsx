import React from "react";
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeSentry } from './lib/sentry'
import { performanceMonitor } from './utils/performanceMonitor'
import { initDevelopmentSecurity } from './utils/devSecurity'

// Initialize Sentry as early as possible
initializeSentry();

// Initialize development security (masks tokens in dev console)
initDevelopmentSecurity();

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  // Log metrics after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      performanceMonitor.reportToAnalytics();
    }, 3000);
  });
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
