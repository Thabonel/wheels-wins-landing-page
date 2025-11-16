import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Plus, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import mapboxgl from 'mapbox-gl';
import { guardedJson } from '@/utils/mapboxGuard';
import { toast } from 'sonner';

interface FreshRouteSearchProps {
  onOriginSet: (coordinates: [number, number], name: string) => void;
  onDestinationSet: (coordinates: [number, number], name: string) => void;
  onClear: () => void;
  origin?: { name: string; coordinates: [number, number] };
  destination?: { name: string; coordinates: [number, number] };
  map: mapboxgl.Map | null;
}

export default function FreshRouteSearch({
  onOriginSet,
  onDestinationSet,
  onClear,
  origin,
  destination,
  map
}: FreshRouteSearchProps) {
  const [originInput, setOriginInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState<any[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<any[]>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isSearchingDestination, setIsSearchingDestination] = useState(false);

  // Update input values when origin/destination props change
  useEffect(() => {
    if (origin) {
      setOriginInput(origin.name);
    }
  }, [origin]);

  useEffect(() => {
    if (destination) {
      setDestinationInput(destination.name);
    }
  }, [destination]);

  // Debounced search for origin
  useEffect(() => {
    if (originInput.length < 3) {
      setOriginSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearchingOrigin(true);
      try {
        const data = await guardedJson(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(originInput)}.json?` +
          `access_token=${mapboxgl.accessToken}&` +
          `country=AU,NZ,US,CA,GB&` +
          `types=place,locality,address,poi&` +
          `limit=5`,
          undefined,
          'geocoding'
        );
        setOriginSuggestions(data.features || []);
        setShowOriginSuggestions(true);
      } catch (error) {
        console.error('Origin search error:', error);
        setOriginSuggestions([]);
      } finally {
        setIsSearchingOrigin(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [originInput]);

  // Debounced search for destination
  useEffect(() => {
    if (destinationInput.length < 3) {
      setDestinationSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearchingDestination(true);
      try {
        const data = await guardedJson(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destinationInput)}.json?` +
          `access_token=${mapboxgl.accessToken}&` +
          `country=AU,NZ,US,CA,GB&` +
          `types=place,locality,address,poi&` +
          `limit=5`,
          undefined,
          'geocoding'
        );
        setDestinationSuggestions(data.features || []);
        setShowDestinationSuggestions(true);
      } catch (error) {
        console.error('Destination search error:', error);
        setDestinationSuggestions([]);
      } finally {
        setIsSearchingDestination(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [destinationInput]);

  const handleOriginSelect = (place: any) => {
    const [lng, lat] = place.center;
    onOriginSet([lng, lat], place.place_name);
    setOriginInput(place.place_name);
    setShowOriginSuggestions(false);
    
    // Fly to location on map
    if (map) {
      map.flyTo({
        center: [lng, lat],
        zoom: 10,
        duration: 1500
      });
    }
  };

  const handleDestinationSelect = (place: any) => {
    const [lng, lat] = place.center;
    onDestinationSet([lng, lat], place.place_name);
    setDestinationInput(place.place_name);
    setShowDestinationSuggestions(false);
    
    // Fit map to show both points if origin is set
    if (map && origin) {
      const bounds = new mapboxgl.LngLatBounds()
        .extend(origin.coordinates)
        .extend([lng, lat]);
      
      map.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 }
      });
    } else if (map) {
      map.flyTo({
        center: [lng, lat],
        zoom: 10,
        duration: 1500
      });
    }
  };

  const handleClearRoute = () => {
    setOriginInput('');
    setDestinationInput('');
    setOriginSuggestions([]);
    setDestinationSuggestions([]);
    onClear();
    toast.info('Route cleared');
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Navigation className="w-4 h-4" />
          Route Planning
        </h3>
        {(origin || destination) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearRoute}
            className="h-7 px-2"
          >
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Origin Input */}
      <div className="space-y-2">
        <Label htmlFor="origin" className="text-xs font-medium flex items-center gap-1">
          <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">A</span>
          Start Point
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            id="origin"
            placeholder="Search for starting location..."
            value={originInput}
            onChange={(e) => setOriginInput(e.target.value)}
            className="pl-9 text-sm"
          />
          
          {/* Origin Suggestions */}
          {showOriginSuggestions && originSuggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border">
              {originSuggestions.map((place) => (
                <button
                  key={place.id}
                  onClick={() => handleOriginSelect(place)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-b-0"
                >
                  <div className="font-medium">{place.place_name.split(',')[0]}</div>
                  <div className="text-xs text-gray-500">
                    {place.place_name.split(',').slice(1).join(',')}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Destination Input */}
      <div className="space-y-2">
        <Label htmlFor="destination" className="text-xs font-medium flex items-center gap-1">
          <span className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">B</span>
          End Point
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            id="destination"
            placeholder="Search for destination..."
            value={destinationInput}
            onChange={(e) => setDestinationInput(e.target.value)}
            className="pl-9 text-sm"
          />
          
          {/* Destination Suggestions */}
          {showDestinationSuggestions && destinationSuggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border">
              {destinationSuggestions.map((place) => (
                <button
                  key={place.id}
                  onClick={() => handleDestinationSelect(place)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-b-0"
                >
                  <div className="font-medium">{place.place_name.split(',')[0]}</div>
                  <div className="text-xs text-gray-500">
                    {place.place_name.split(',').slice(1).join(',')}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Route Info */}
      {origin && destination && (
        <div className="bg-blue-50 rounded-md p-2 text-xs">
          <div className="text-blue-700 font-medium">Route Set</div>
          <div className="text-blue-600 mt-1">
            Click the <Plus className="w-3 h-3 inline" /> button to add waypoints between A and B
          </div>
        </div>
      )}
    </Card>
  );
}
