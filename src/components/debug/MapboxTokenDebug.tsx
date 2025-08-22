import React from 'react';

const MapboxTokenDebug: React.FC = () => {
  const publicToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || '';
  const legacyToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
  
  const getTokenInfo = (token: string) => {
    if (!token) return { status: '❌ Not set', type: 'N/A' };
    if (token.startsWith('pk.')) return { status: '✅ Valid public token', type: 'Public (pk.*)' };
    if (token.startsWith('sk.')) return { status: '❌ Invalid secret token', type: 'Secret (sk.*)' };
    return { status: '⚠️ Unknown format', type: 'Unknown' };
  };
  
  const publicInfo = getTokenInfo(publicToken);
  const legacyInfo = getTokenInfo(legacyToken);
  
  return (
    <div className="fixed top-20 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 z-50 max-w-md">
      <h3 className="font-bold text-lg mb-3">🗺️ Mapbox Token Debug</h3>
      
      <div className="space-y-3 text-sm">
        <div className="border rounded p-2">
          <div className="font-semibold">VITE_MAPBOX_PUBLIC_TOKEN</div>
          <div className="text-xs text-gray-600">{publicInfo.status}</div>
          <div className="text-xs">Type: {publicInfo.type}</div>
          {publicToken && (
            <div className="text-xs font-mono mt-1">{publicToken.substring(0, 20)}...</div>
          )}
        </div>
        
        <div className="border rounded p-2">
          <div className="font-semibold">VITE_MAPBOX_TOKEN (Legacy)</div>
          <div className="text-xs text-gray-600">{legacyInfo.status}</div>
          <div className="text-xs">Type: {legacyInfo.type}</div>
          {legacyToken && (
            <div className="text-xs font-mono mt-1">{legacyToken.substring(0, 20)}...</div>
          )}
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs">
          <div className="font-semibold text-yellow-800 mb-1">⚠️ Render Configuration Required</div>
          <div className="text-yellow-700">
            In Render dashboard, set environment variable:
            <div className="font-mono mt-1">VITE_MAPBOX_PUBLIC_TOKEN = pk.eyJ1Ijo...</div>
            <div className="mt-1">Use one of the public tokens provided by the user</div>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs">
          <div className="font-semibold text-blue-800 mb-1">ℹ️ Token Types</div>
          <div className="text-blue-700">
            <div>• <span className="font-mono">pk.*</span> = Public token (frontend use)</div>
            <div>• <span className="font-mono">sk.*</span> = Secret token (backend only)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapboxTokenDebug;