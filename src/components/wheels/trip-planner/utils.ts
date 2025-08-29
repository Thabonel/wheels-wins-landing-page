
import { mapboxProxy } from "@/services/mapboxProxy";
import { circle } from "@turf/turf";
import type { FeatureCollection, Feature } from "geojson";

export async function reverseGeocode([lng, lat]: [number, number]): Promise<string> {
  try {
    // Try to get a human-readable address with different granularity levels
    const data = await mapboxProxy.geocoding.reverse(lng, lat, {
      types: ['address', 'poi', 'place', 'locality', 'neighborhood', 'postcode']
    });
    
    // Check if we got a valid response with features
    if (data.features && data.features.length > 0) {
      // Try to find the most specific result
      const feature = data.features[0];
      
      // Extract a more concise name if possible
      if (feature.place_name) {
        // Remove country name if it's too long
        const parts = feature.place_name.split(',');
        if (parts.length > 3) {
          // Keep only the first 3 parts for a cleaner display
          return parts.slice(0, 3).join(',').trim();
        }
        return feature.place_name;
      }
    }
    
    // If geocoding returned no results, try a fallback with broader search
    console.warn('No results from reverse geocoding, trying broader search...');
    const fallbackData = await mapboxProxy.geocoding.reverse(lng, lat, {
      types: ['district', 'region', 'country']
    });
    
    if (fallbackData.features && fallbackData.features.length > 0) {
      return fallbackData.features[0].place_name || `Near ${lat.toFixed(3)}, ${lng.toFixed(3)}`;
    }
    
    // Last resort: return a user-friendly approximation
    return `Near ${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    
    // Try direct Mapbox API as absolute fallback (if token is available)
    try {
      const token = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN;
      if (token && token.startsWith('pk.')) {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=address,poi,place`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            const parts = data.features[0].place_name.split(',');
            if (parts.length > 3) {
              return parts.slice(0, 3).join(',').trim();
            }
            return data.features[0].place_name;
          }
        }
      }
    } catch (fallbackError) {
      console.error('Direct API fallback also failed:', fallbackError);
    }
    
    // Final fallback with user-friendly format
    return `Location ${lat.toFixed(3)}°${lat >= 0 ? 'N' : 'S'}, ${lng.toFixed(3)}°${lng >= 0 ? 'E' : 'W'}`;
  }
}

export function hideGeocoderIcon() {
  const style = document.createElement("style");
  style.innerHTML = `.mapboxgl-ctrl-geocoder .mapboxgl-ctrl-geocoder--icon { display: none; }`;
  document.head.appendChild(style);
  return () => {
    if (document.head.contains(style)) {
      document.head.removeChild(style);
    }
  };
}

export async function fetchPhoneCoverage(lng: number, lat: number): Promise<FeatureCollection> {
  const apiKey = import.meta.env.OPEN_CELL_ID_API_KEY;
  if (!apiKey) {
    console.warn("OPEN_CELL_ID_API_KEY is not set");
    return { type: "FeatureCollection", features: [] };
  }

  const url = `https://opencellid.org/cell/get?key=${apiKey}&lat=${lat}&lon=${lng}&format=json`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    const cells = json.cells || [];
    const features = cells.map((c: any) =>
      circle([c.lon, c.lat], (c.range || 1000) / 1000, { steps: 32, units: "kilometers" }) as Feature
    );
    return { type: "FeatureCollection", features };
  } catch (err) {
    console.error("Failed to fetch phone coverage", err);
    return { type: "FeatureCollection", features: [] };
  }
}
