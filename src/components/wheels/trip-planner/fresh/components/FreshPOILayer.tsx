import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

interface POI {
  id: string;
  name: string;
  category: string;
  description: string;
  latitude: number;
  longitude: number;
}

interface FreshPOILayerProps {
  map: mapboxgl.Map | null;
  filters: Record<string, boolean>;
  rvServices?: Record<string, boolean>;
}

export default function FreshPOILayer({ map, filters, rvServices = {} }: FreshPOILayerProps) {
  const [pois, setPois] = useState<POI[]>([]);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    // Sample POI data - includes both general POIs and RV-specific services
    const samplePOIs: POI[] = [
      // General POIs
      { id: '1', name: 'Dog Park Sydney', category: 'pet_stop', description: 'Off-leash area', latitude: -33.8688, longitude: 151.2093 },
      { id: '2', name: 'RV Parking Melbourne', category: 'wide_parking', description: 'Wide spaces for RVs', latitude: -37.8136, longitude: 144.9631 },
      { id: '3', name: 'Brisbane Emergency', category: 'medical', description: '24/7 Emergency Services', latitude: -27.4698, longitude: 153.0251 },
      { id: '4', name: 'Adelaide Markets', category: 'farmers_market', description: 'Fresh local produce', latitude: -34.9285, longitude: 138.6007 },
      { id: '17', name: 'Shell Service Station Perth', category: 'fuel', description: 'Fuel & convenience', latitude: -31.9500, longitude: 115.8600 },
      { id: '18', name: 'BP Travel Centre Darwin', category: 'fuel', description: '24/7 fuel & food', latitude: -12.4634, longitude: 130.8456 },
      { id: '19', name: 'Kakadu Camping Area', category: 'camping', description: 'National park camping', latitude: -12.6743, longitude: 132.8820 },
      { id: '20', name: 'Blue Mountains Camping NSW', category: 'camping', description: 'Mountain retreat camping', latitude: -33.7074, longitude: 150.3118 },
      { id: '21', name: 'Visitor Centre Cairns', category: 'dump_station', description: 'Tourist info & facilities', latitude: -16.9186, longitude: 145.7781 },
      { id: '22', name: 'Rest Area Gold Coast', category: 'dump_station', description: 'Highway rest stop', latitude: -28.0167, longitude: 153.4000 },
      { id: '23', name: 'Natural Springs Ballarat', category: 'water', description: 'Fresh spring water', latitude: -37.5622, longitude: 143.8503 },
      { id: '24', name: 'Mountain Spring Hobart', category: 'water', description: 'Pure mountain water', latitude: -42.8821, longitude: 147.3272 },
      
      // RV Services POIs
      { id: '5', name: 'Big4 Holiday Park Sydney', category: 'rvParks', description: 'Full hookup RV sites', latitude: -33.8650, longitude: 151.2000 },
      { id: '6', name: 'Discovery Parks Melbourne', category: 'rvParks', description: 'Pet-friendly RV park', latitude: -37.8200, longitude: 144.9500 },
      { id: '7', name: 'Riverside Camping Brisbane', category: 'campgrounds', description: 'Scenic riverside camping', latitude: -27.4600, longitude: 153.0300 },
      { id: '8', name: 'Outback Oasis Perth', category: 'campgrounds', description: 'Desert camping experience', latitude: -31.9505, longitude: 115.8605 },
      { id: '9', name: 'RV Dump Station Sydney', category: 'dumpStations', description: 'Free dump station', latitude: -33.8600, longitude: 151.2100 },
      { id: '10', name: 'Waste Disposal Melbourne', category: 'dumpStations', description: '$5 dump fee', latitude: -37.8100, longitude: 144.9700 },
      { id: '11', name: 'Gas Plus Propane Sydney', category: 'propane', description: 'Propane refills & exchange', latitude: -33.8700, longitude: 151.1900 },
      { id: '12', name: 'Aussie Gas Melbourne', category: 'propane', description: '24/7 propane service', latitude: -37.8000, longitude: 144.9800 },
      { id: '13', name: 'Fresh Water Fill Brisbane', category: 'waterFill', description: 'Potable water available', latitude: -27.4800, longitude: 153.0100 },
      { id: '14', name: 'H2O Station Adelaide', category: 'waterFill', description: 'Free water fill-up', latitude: -34.9300, longitude: 138.5900 },
      { id: '15', name: 'RV Mechanics Sydney', category: 'rvRepair', description: 'Mobile RV repairs', latitude: -33.8750, longitude: 151.1950 },
      { id: '16', name: 'Caravan Service Centre Melbourne', category: 'rvRepair', description: 'Full service & parts', latitude: -37.8050, longitude: 144.9650 }
    ];
    setPois(samplePOIs);
  }, []);

  useEffect(() => {
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    pois.forEach(poi => {
      // Check if POI should be displayed based on filters or RV services
      const isGeneralPOI = filters[poi.category];
      const isRVService = rvServices[poi.category];
      
      if (!isGeneralPOI && !isRVService) return;

      const el = document.createElement('div');
      el.className = 'poi-marker';
      el.style.fontSize = '20px';
      el.textContent = getIcon(poi.category);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([poi.longitude, poi.latitude])
        .addTo(map);

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div class="p-2 text-sm"><div class="font-semibold mb-1">${poi.name}</div><div>${poi.description}</div></div>`
      );
      
      marker.getElement().addEventListener('click', () => {
        marker.setPopup(popup);
        popup.addTo(map);
      });

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
    };
  }, [map, pois, filters, rvServices]);

  return null;
}

function getIcon(category: string): string {
  switch (category) {
    // General POI categories
    case 'pet_stop':
      return '🐾';
    case 'wide_parking':
      return '🅿️';
    case 'medical':
      return '🚑';
    case 'farmers_market':
      return '🥕';
    case 'fuel':
      return '⛽';
    case 'camping':
      return '⛺';
    case 'dump_station':
      return '🚽';
    case 'water':
      return '💧';
    
    // RV Service categories  
    case 'rvParks':
      return '🏕️';
    case 'campgrounds':
      return '⛺';
    case 'dumpStations':
      return '🚽';
    case 'propane':
      return '🔥';
    case 'waterFill':
      return '💧';
    case 'rvRepair':
      return '🔧';
    
    default:
      return '📍';
  }
}
