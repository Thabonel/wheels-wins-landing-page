import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const MapboxDebugComponent: React.FC = () => {
  const [showTokens, setShowTokens] = useState(false);
  
  const publicToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || '';
  const legacyToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
  
  const getTokenStatus = (token: string) => {
    if (!token) return { status: '❌ Not set', type: 'Missing', valid: false };
    if (token.startsWith('pk.')) {
      if (token.length > 50 && token.includes('.')) {
        return { status: '✅ Valid format', type: 'Public (pk.*)', valid: true };
      }
      return { status: '⚠️ Malformed', type: 'Public (incomplete)', valid: false };
    }
    if (token.startsWith('sk.')) return { status: '❌ Wrong type', type: 'Secret (sk.*)', valid: false };
    return { status: '❌ Invalid', type: 'Unknown format', valid: false };
  };
  
  const publicStatus = getTokenStatus(publicToken);
  const legacyStatus = getTokenStatus(legacyToken);
  
  const maskToken = (token: string) => {
    if (!token || token.length < 20) return token;
    return `${token.substring(0, 7)}...${token.substring(token.length - 4)}`;
  };
  
  return (
    <div className="fixed bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 z-50 max-w-md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm">🗺️ Mapbox Configuration</h3>
        <button
          onClick={() => setShowTokens(!showTokens)}
          className="p-1 hover:bg-gray-100 rounded"
          title={showTokens ? 'Hide tokens' : 'Show tokens'}
        >
          {showTokens ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="border rounded p-2 bg-gray-50">
          <div className="font-semibold">VITE_MAPBOX_PUBLIC_TOKEN</div>
          <div className={publicStatus.valid ? 'text-green-600' : 'text-red-600'}>
            {publicStatus.status} - {publicStatus.type}
          </div>
          {publicToken && (
            <div className="font-mono text-gray-600 mt-1">
              {showTokens ? publicToken : maskToken(publicToken)}
            </div>
          )}
        </div>
        
        <div className="border rounded p-2 bg-gray-50">
          <div className="font-semibold">VITE_MAPBOX_TOKEN (Legacy)</div>
          <div className={legacyStatus.valid ? 'text-green-600' : 'text-red-600'}>
            {legacyStatus.status} - {legacyStatus.type}
          </div>
          {legacyToken && (
            <div className="font-mono text-gray-600 mt-1">
              {showTokens ? legacyToken : maskToken(legacyToken)}
            </div>
          )}
        </div>
        
        <div className="mt-2 pt-2 border-t text-gray-600">
          <div>Environment: {import.meta.env.MODE}</div>
          <div>Base URL: {import.meta.env.BASE_URL}</div>
        </div>
        
        {(!publicStatus.valid && !legacyStatus.valid) && (
          <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
            <div className="font-semibold text-red-800">Action Required:</div>
            <div className="text-red-700 mt-1">
              Update Netlify environment variables with a valid public token (pk.*)
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapboxDebugComponent;