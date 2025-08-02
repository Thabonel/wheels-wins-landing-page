// Optimized Mapbox loader with progressive enhancement
let mapboxglPromise: Promise<typeof import('mapbox-gl')> | null = null;
let mapboxDirectionsPromise: Promise<any> | null = null;

export const loadMapboxGL = async () => {
  if (!mapboxglPromise) {
    mapboxglPromise = import('mapbox-gl').then(module => {
      // Set the access token
      module.default.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 
                                   import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || '';
      
      // Preload the worker to speed up map initialization
      module.default.prewarm();
      
      return module.default;
    });
  }
  return mapboxglPromise;
};

export const loadMapboxDirections = async () => {
  if (!mapboxDirectionsPromise) {
    mapboxDirectionsPromise = Promise.all([
      loadMapboxGL(), // Ensure mapbox-gl is loaded first
      import('@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions')
    ]).then(([mapboxgl, directionsModule]) => {
      return directionsModule.default;
    });
  }
  return mapboxDirectionsPromise;
};

// Preload function to be called on hover/focus
export const preloadMapbox = () => {
  // Start loading both in parallel but don't wait
  loadMapboxGL().catch(console.error);
  loadMapboxDirections().catch(console.error);
};

// Check if Mapbox is already loaded
export const isMapboxLoaded = () => {
  return mapboxglPromise !== null;
};