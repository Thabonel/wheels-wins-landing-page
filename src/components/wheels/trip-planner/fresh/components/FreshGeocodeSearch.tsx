import React, { useState, useRef, useEffect } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import mapboxgl from 'mapbox-gl';
import { guardedJson } from '@/utils/mapboxGuard';

interface FreshGeocodeSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (coordinates: [number, number], name: string) => void;
  map: mapboxgl.Map | null;
}

interface SearchResult {
  id: string;
  place_name: string;
  center: [number, number];
  place_type: string[];
}

export default function FreshGeocodeSearch({ 
  isOpen, 
  onClose, 
  onLocationSelect,
  map 
}: FreshGeocodeSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    setIsSearching(true);
    
    try {
      const data = await guardedJson(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${mapboxgl.accessToken}&` +
        `country=AU,NZ,US,CA,GB&` + // Focus on common countries
        `types=place,locality,address,poi&` +
        `limit=5`,
        undefined,
        'geocoding'
      );
      setSearchResults(data.features || []);
    } catch (error) {
      console.error('Geocoding error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (result: SearchResult) => {
    onLocationSelect(result.center, result.place_name);
    
    // Fly to the selected location
    if (map) {
      map.flyTo({
        center: result.center,
        zoom: 12,
        duration: 2000
      });
    }
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Card className="absolute top-16 right-2 z-[10002] w-96 max-h-[500px] overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Search className="w-4 h-4" />
            Search Location
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search for a place..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {isSearching && (
          <div className="p-4 text-center text-gray-600">
            Searching...
          </div>
        )}
        
        {!isSearching && searchResults.length === 0 && searchQuery.length >= 3 && (
          <div className="p-4 text-center text-gray-600">
            No results found
          </div>
        )}
        
        {!isSearching && searchResults.length > 0 && (
          <div className="p-2">
            {searchResults.map((result) => (
              <button
                key={result.id}
                onClick={() => handleSelectLocation(result)}
                className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {result.place_name.split(',')[0]}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {result.place_name.split(',').slice(1).join(',')}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
        
        {!isSearching && searchQuery.length < 3 && searchQuery.length > 0 && (
          <div className="p-4 text-center text-gray-500 text-sm">
            Type at least 3 characters to search
          </div>
        )}
      </div>
    </Card>
  );
}
