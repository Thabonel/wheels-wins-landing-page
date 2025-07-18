export default function MapUnavailable() {
  return (
    <div className="h-[60vh] lg:h-[70vh] flex items-center justify-center rounded-lg border bg-gray-100">
      <div className="text-center p-6">
        <div className="text-6xl mb-4">🗺️</div>
        <h4 className="text-lg font-semibold text-gray-800 mb-2">Map Unavailable</h4>
        <p className="text-gray-600 text-sm">
          Mapbox access token is missing. Map features are disabled.
        </p>
      </div>
    </div>
  );
}
