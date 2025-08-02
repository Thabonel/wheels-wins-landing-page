import { useRef, useState, useEffect } from 'react';
import { loadMapboxGL, loadMapboxDirections } from '@/utils/mapboxLoader';
import TripPlannerControls from './TripPlannerControls';
import TripPlannerHeader from './TripPlannerHeader';
import OfflineTripBanner from './OfflineTripBanner';
import WaypointsList from './WaypointsList';
import SuggestionsGrid from './SuggestionsGrid';
import MapControls from './MapControls';
import TripStats from './TripStats';
import EnhancedTripStats from './EnhancedTripStats';
import PastTripsSection from './PastTripsSection';
import { Itinerary } from './types';
import { ItineraryService } from './services/ItineraryService';
import { useIntegratedTripState } from './hooks/useIntegratedTripState';
import { useTripPlannerHandlers } from './hooks/useTripPlannerHandlers';
import { PAMProvider } from './PAMContext';
import { useToast } from '@/hooks/use-toast';
import { useRegion } from '@/context/RegionContext';
import { useOffline } from '@/context/OfflineContext';
import TripPlannerLayout from './TripPlannerLayout';
import MapUnavailable from './MapUnavailable';

interface OptimizedIntegratedTripPlannerProps {
  isOffline?: boolean;
  templateData?: any;
  onMapLoaded?: (loadTime: number) => void;
  budget?: any;
  setBudget?: any;
  friends?: any[];
  setFriends?: any;
  originName?: string;
  setOriginName?: any;
  destName?: string;
  setDestName?: any;
  waypointNames?: string[];
  setWaypointNames?: any;
  templateRoute?: any;
}

export default function OptimizedIntegratedTripPlanner({
  isOffline: isOfflineProp,
  templateData,
  onMapLoaded,
  ...props
}: OptimizedIntegratedTripPlannerProps) {
  const { toast } = useToast();
  const { region } = useRegion();
  const { isOffline } = useOffline();
  const effectiveOfflineMode = isOfflineProp ?? isOffline;
  
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const directionsControlRef = useRef<any | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapLoadStartTime = useRef<number>(performance.now());
  
  // State management
  const integratedState = useIntegratedTripState(effectiveOfflineMode);
  const handlers = useTripPlannerHandlers(
    directionsControlRef,
    mapRef.current,
    integratedState
  );

  // Initialize map with optimized loading
  useEffect(() => {
    if (!mapContainerRef.current || effectiveOfflineMode || mapLoaded) return;

    const initializeMap = async () => {
      try {
        mapLoadStartTime.current = performance.now();
        
        // Load Mapbox GL dynamically
        const mapboxgl = await loadMapboxGL();
        
        if (!mapboxgl.accessToken) {
          throw new Error('Mapbox token not configured');
        }

        // Create map instance
        const map = new mapboxgl.Map({
          container: mapContainerRef.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [-98.5795, 39.8283], // Center of USA
          zoom: 4,
          optimizeForTerrain: true,
          trackResize: true,
          preserveDrawingBuffer: false, // Better performance
        });

        mapRef.current = map;

        // Load directions control in parallel
        const [MapboxDirections] = await Promise.all([
          loadMapboxDirections(),
          new Promise(resolve => map.once('load', resolve))
        ]);

        // Initialize directions
        const directions = new MapboxDirections({
          accessToken: mapboxgl.accessToken,
          unit: 'imperial',
          profile: 'mapbox/driving',
          controls: {
            inputs: false,
            instructions: true,
            profileSwitcher: false
          },
          interactive: false
        });

        map.addControl(directions, 'top-left');
        directionsControlRef.current = directions;

        // Record map load time
        const loadTime = performance.now() - mapLoadStartTime.current;
        if (onMapLoaded) {
          onMapLoaded(loadTime);
        }

        setMapLoaded(true);
        
        // Set up event listeners
        directions.on('route', (event: any) => {
          if (event.route && event.route.length > 0) {
            const route = event.route[0];
            integratedState.setActiveRoute({
              distance: route.distance,
              duration: route.duration,
              legs: route.legs || []
            });
          }
        });

        map.on('error', (e: any) => {
          console.error('Map error:', e);
          if (e.error?.message?.includes('401')) {
            setMapError('Invalid Mapbox token. Please check your configuration.');
          }
        });

      } catch (error) {
        console.error('Failed to initialize map:', error);
        setMapError('Failed to load map. Please check your connection and try again.');
      }
    };

    initializeMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      directionsControlRef.current = null;
    };
  }, [effectiveOfflineMode, mapLoaded]);

  // Apply template data when provided
  useEffect(() => {
    if (templateData && directionsControlRef.current) {
      if (templateData.origin) {
        directionsControlRef.current.setOrigin(templateData.origin);
      }
      if (templateData.destination) {
        directionsControlRef.current.setDestination(templateData.destination);
      }
      if (templateData.waypoints) {
        templateData.waypoints.forEach((wp: any, index: number) => {
          directionsControlRef.current.addWaypoint(index, wp);
        });
      }
    }
  }, [templateData, mapLoaded]);

  if (effectiveOfflineMode) {
    return (
      <TripPlannerLayout 
        offlineBanner={<OfflineTripBanner />}
        mapSection={<MapUnavailable />}
        controlsSection={
          <TripPlannerControls
            onSwapLocations={handlers.handleSwapLocations}
            onClearAll={handlers.handleClearAll}
            isOfflineMode={true}
          />
        }
        statsSection={<div className="text-gray-500">Stats unavailable offline</div>}
      />
    );
  }

  return (
    <PAMProvider initialTrip={integratedState.currentTrip}>
      <TripPlannerLayout
        header={<TripPlannerHeader />}
        mapSection={
          <div className="relative h-full">
            {mapError ? (
              <MapUnavailable error={mapError} />
            ) : (
              <>
                <div ref={mapContainerRef} className="w-full h-full rounded-lg" />
                {mapLoaded && (
                  <MapControls 
                    mapRef={mapRef}
                    directionsControl={directionsControlRef}
                    suggestions={integratedState.suggestions}
                    hiddenCategories={integratedState.hiddenCategories}
                    onToggleCategory={(category) => {
                      const newHidden = integratedState.hiddenCategories.includes(category)
                        ? integratedState.hiddenCategories.filter(c => c !== category)
                        : [...integratedState.hiddenCategories, category];
                      integratedState.setHiddenCategories(newHidden);
                    }}
                  />
                )}
              </>
            )}
          </div>
        }
        controlsSection={
          <TripPlannerControls
            originName={integratedState.originName}
            destName={integratedState.destName}
            waypointNames={integratedState.waypointNames}
            onOriginChange={integratedState.setOriginName}
            onDestChange={integratedState.setDestName}
            onWaypointChange={(index, value) => {
              const newWaypoints = [...integratedState.waypointNames];
              newWaypoints[index] = value;
              integratedState.setWaypointNames(newWaypoints);
            }}
            onAddWaypoint={() => integratedState.setWaypointNames([...integratedState.waypointNames, ''])}
            onRemoveWaypoint={(index) => {
              const newWaypoints = integratedState.waypointNames.filter((_, i) => i !== index);
              integratedState.setWaypointNames(newWaypoints);
              if (directionsControlRef.current) {
                directionsControlRef.current.removeWaypoint(index);
              }
            }}
            onSwapLocations={handlers.handleSwapLocations}
            onClearAll={handlers.handleClearAll}
            directionsControl={directionsControlRef}
            isOfflineMode={effectiveOfflineMode}
          />
        }
        waypointsSection={
          integratedState.waypointNames.length > 0 && (
            <WaypointsList 
              waypoints={integratedState.waypointNames}
              onRemove={(index) => {
                const newWaypoints = integratedState.waypointNames.filter((_, i) => i !== index);
                integratedState.setWaypointNames(newWaypoints);
                if (directionsControlRef.current) {
                  directionsControlRef.current.removeWaypoint(index);
                }
              }}
            />
          )
        }
        suggestionsSection={
          <SuggestionsGrid 
            suggestions={integratedState.suggestions}
            onApplySuggestion={(suggestion) => {
              toast({
                title: "Suggestion Applied",
                description: suggestion.description,
              });
            }}
          />
        }
        statsSection={
          integratedState.activeRoute ? (
            <EnhancedTripStats 
              distance={integratedState.activeRoute.distance}
              duration={integratedState.activeRoute.duration}
              estimatedFuelCost={integratedState.estimatedFuelCost}
              estimatedCampingCost={integratedState.estimatedCampingCost}
              totalEstimatedCost={integratedState.totalEstimatedCost}
            />
          ) : (
            <TripStats directionsControl={directionsControlRef} />
          )
        }
        itinerarySection={
          integratedState.generatedItinerary && (
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-3">Generated Itinerary</h3>
              <div className="space-y-2">
                {integratedState.generatedItinerary.days.map((day, index) => (
                  <div key={index} className="border-l-2 border-blue-500 pl-3">
                    <h4 className="font-medium">Day {day.dayNumber}</h4>
                    <p className="text-sm text-gray-600">{day.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        }
        pastTripsSection={<PastTripsSection />}
      />
    </PAMProvider>
  );
}