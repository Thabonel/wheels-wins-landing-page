import { getMapboxDebugInfo, getMapUnavailableReason } from '@/utils/mapboxConfig';

export default function MapUnavailable() {
  const debugInfo = getMapboxDebugInfo();
  const reason = getMapUnavailableReason();
  
  return (
    <div className="h-[60vh] lg:h-[70vh] flex items-center justify-center rounded-lg border bg-gray-100">
      <div className="text-center p-6">
        <div className="text-6xl mb-4">🗺️</div>
        <h4 className="text-lg font-semibold text-gray-800 mb-2">Map Unavailable</h4>
        <p className="text-gray-600 text-sm mb-4">
          {reason}
        </p>
        <div className="text-xs text-gray-500 bg-gray-200 p-2 rounded">
          <strong>Debug Info (Industry Standard Token Management):</strong><br />
          Public Token: {debugInfo.hasPublicToken ? 'Configured' : 'Missing'}<br />
          Legacy Token: {debugInfo.hasLegacyToken ? 'Available' : 'Missing'}<br />
          Active Token: {debugInfo.currentToken || 'None'}<br />
          Token Source: {debugInfo.tokenSource}<br />
          Environment: {debugInfo.environment}<br />
          {debugInfo.recommendations.createPublicToken && (
            <><br /><strong className="text-orange-600">⚠️ Recommendation:</strong> Create VITE_MAPBOX_PUBLIC_TOKEN</>
          )}
          {debugInfo.recommendations.migrateFromLegacy && (
            <><br /><strong className="text-blue-600">🔄 Migration:</strong> Switch to public token for better security</>
          )}
        </div>
      </div>
    </div>
  );
}
