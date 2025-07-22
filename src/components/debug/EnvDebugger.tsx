/**
 * Environment Debugger Component
 * Temporary component to help diagnose Netlify deployment issues
 */

import React from 'react';
import { validateEnvironment } from '../../config/env-validator';

export const EnvDebugger: React.FC = () => {
  const validation = validateEnvironment();
  
  // Only show in production if there are errors (for debugging white screen issues)
  if (import.meta.env.DEV || !validation.isValid) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-100 border-b-2 border-red-400 p-4">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-lg font-bold text-red-800 mb-2">
            🔧 Environment Configuration Debug
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-red-700">Build Info:</h4>
              <ul className="space-y-1">
                <li>Mode: {import.meta.env.MODE}</li>
                <li>Production: {import.meta.env.PROD ? 'Yes' : 'No'}</li>
                <li>Development: {import.meta.env.DEV ? 'Yes' : 'No'}</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-red-700">Environment Variables:</h4>
              <ul className="space-y-1">
                <li>VITE_SUPABASE_URL: {import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</li>
                <li>VITE_SUPABASE_ANON_KEY: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</li>
                <li>VITE_MAPBOX_TOKEN: {import.meta.env.VITE_MAPBOX_TOKEN ? '✅ Set' : '⚠️ Missing'}</li>
              </ul>
            </div>
          </div>
          
          {validation.errors.length > 0 && (
            <div className="mt-3">
              <h4 className="font-semibold text-red-700">Errors:</h4>
              <ul className="list-disc list-inside space-y-1 text-red-600">
                {validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {validation.warnings.length > 0 && (
            <div className="mt-3">
              <h4 className="font-semibold text-orange-700">Warnings:</h4>
              <ul className="list-disc list-inside space-y-1 text-orange-600">
                {validation.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="mt-3 text-xs text-gray-600">
            This debug panel appears when environment variables are missing or invalid.
            Configure environment variables in your Netlify site settings.
          </div>
        </div>
      </div>
    );
  }
  
  return null;
};

export default EnvDebugger;