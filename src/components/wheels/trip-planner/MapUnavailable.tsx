export default function MapUnavailable() {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  
  return (
    <div className="h-[60vh] lg:h-[70vh] flex items-center justify-center rounded-lg border bg-gray-100">
      <div className="text-center p-6">
        <div className="text-6xl mb-4">🗺️</div>
        <h4 className="text-lg font-semibold text-gray-800 mb-2">Map Unavailable</h4>
        <p className="text-gray-600 text-sm mb-4">
          Mapbox access token is missing. Map features are disabled.
        </p>
        <div className="text-xs text-gray-500 bg-gray-200 p-2 rounded">
          <strong>Debug Info:</strong><br />
          Token exists: {token ? 'Yes' : 'No'}<br />
          Token length: {token?.length || 0}<br />
          Token preview: {token ? `${token.substring(0, 10)}...` : 'None'}<br />
          Environment: {import.meta.env.MODE || 'Unknown'}
        </div>
      </div>
    </div>
  );
}
