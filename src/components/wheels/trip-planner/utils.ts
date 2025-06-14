
import mapboxgl from "mapbox-gl";

export async function reverseGeocode([lng, lat]: [number, number]): Promise<string> {
  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`
  );
  const data = await res.json();
  return data.features?.[0]?.place_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
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
