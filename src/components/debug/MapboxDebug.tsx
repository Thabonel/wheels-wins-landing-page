/**
 * Mapbox Debug Component
 * 
 * Shows detailed information about Mapbox token configuration
 * for troubleshooting the "missing access token" issue
 */

import { useEffect, useState } from 'react';
import { getMapboxDebugInfo, getMapboxPublicToken } from '@/utils/mapboxConfig';

export default function MapboxDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [mapboxGlInfo, setMapboxGlInfo] = useState<any>(null);

  useEffect(() => {
    // Get our custom debug info
    setDebugInfo(getMapboxDebugInfo());
    
    // Check what mapbox-gl actually sees
    import('mapbox-gl').then((mapboxgl) => {
      setMapboxGlInfo({
        accessToken: mapboxgl.default.accessToken,
        hasAccessToken: Boolean(mapboxgl.default.accessToken),
        version: mapboxgl.default.version,
      });
    }).catch((error) => {
      setMapboxGlInfo({
        error: error.message
      });
    });
  }, []);

  const currentToken = getMapboxPublicToken();

  return (
    <div className="bg-gray-100 p-4 rounded-lg border text-sm space-y-4">
      <h3 className="font-semibold text-lg">🔍 Mapbox Debug Information</h3>
      
      <div>
        <h4 className="font-medium text-blue-700">Environment Variables:</h4>
        <div className="ml-4 text-xs space-y-1">
          <div>VITE_MAPBOX_PUBLIC_TOKEN: {import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN ? `${import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN.substring(0, 20)}...` : '❌ Not set'}</div>
          <div>VITE_MAPBOX_TOKEN: {import.meta.env.VITE_MAPBOX_TOKEN ? `${import.meta.env.VITE_MAPBOX_TOKEN.substring(0, 20)}...` : '❌ Not set'}</div>
          <div>Environment Mode: {import.meta.env.MODE}</div>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-green-700">Configuration Utils:</h4>
        <div className="ml-4 text-xs space-y-1">
          <div>Current Token: {currentToken ? `${currentToken.substring(0, 20)}...` : '❌ No token'}</div>
          {debugInfo && (
            <>
              <div>Has Public Token: {debugInfo.hasPublicToken ? '✅' : '❌'}</div>
              <div>Has Legacy Token: {debugInfo.hasLegacyToken ? '✅' : '❌'}</div>
              <div>Token Source: {debugInfo.tokenSource}</div>
            </>
          )}
        </div>
      </div>

      <div>
        <h4 className="font-medium text-purple-700">Mapbox GL Status:</h4>
        <div className="ml-4 text-xs space-y-1">
          {mapboxGlInfo ? (
            mapboxGlInfo.error ? (
              <div>❌ Error loading mapbox-gl: {mapboxGlInfo.error}</div>
            ) : (
              <>
                <div>mapboxgl.accessToken: {mapboxGlInfo.accessToken ? `${mapboxGlInfo.accessToken.substring(0, 20)}...` : '❌ Not set'}</div>
                <div>Has Access Token: {mapboxGlInfo.hasAccessToken ? '✅' : '❌'}</div>
                <div>Mapbox GL Version: {mapboxGlInfo.version}</div>
              </>
            )
          ) : (
            <div>Loading...</div>
          )}
        </div>
      </div>

      <div>
        <h4 className="font-medium text-red-700">Recommendations:</h4>
        <div className="ml-4 text-xs space-y-1">
          {!import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN && (
            <div>🔧 Set VITE_MAPBOX_PUBLIC_TOKEN in .env file</div>
          )}
          {!currentToken && (
            <div>🔧 Current token resolution failed - check token format</div>
          )}
          {mapboxGlInfo && !mapboxGlInfo.hasAccessToken && (
            <div>🔧 mapboxgl.accessToken not set - initialization may have failed</div>
          )}
        </div>
      </div>
    </div>
  );
}