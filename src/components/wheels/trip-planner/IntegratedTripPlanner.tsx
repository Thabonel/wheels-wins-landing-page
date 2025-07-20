import { useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import TripPlannerControls from './TripPlannerControls';
import TripPlannerHeader from './TripPlannerHeader';
import OfflineTripBanner from './OfflineTripBanner';
import WaypointsList from './WaypointsList';
import SuggestionsGrid from './SuggestionsGrid';
import LockedPointControls from './LockedPointControls';
import MapControls from './MapControls';
import TripStats from './TripStats';
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

interface IntegratedTripPlannerProps {
  isOffline?: boolean;
}

export default function IntegratedTripPlanner({
  isOffline: isOfflineProp,
}: IntegratedTripPlannerProps) {
  const { toast } = useToast();
  const { region } = useRegion();
  const { isOffline } = useOffline();
  const effectiveOfflineMode = isOfflineProp ?? isOffline;
  
  // Get Mapbox token with improved detection
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
  const hasMapToken = Boolean(mapboxToken && mapboxToken.trim().length > 0 && !mapboxToken.includes('your_mapbox_token_here'));
  
  // Debug logging for map token detection
  console.log('🗺️ Map Token Debug:', {
    rawToken: mapboxToken,
    tokenType: typeof mapboxToken,
    tokenLength: mapboxToken?.length,
    tokenExists: !!mapboxToken,
    hasValidToken: hasMapToken,
    effectiveOfflineMode,
    allEnvVars: Object.keys(import.meta.env).filter(key => key.includes('MAPBOX'))
  });
  
  const mapUnavailable = !hasMapToken && !effectiveOfflineMode;
  const map = useRef<mapboxgl.Map>();
  const directionsControl = useRef<MapboxDirections>();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);

  // Set Mapbox access token when available
  if (!effectiveOfflineMode && hasMapToken && mapboxToken) {
    mapboxgl.accessToken = mapboxToken;
    console.log('✅ Mapbox token set successfully');
  }

  // Use integrated state management
  const integratedState = useIntegratedTripState(effectiveOfflineMode);
  const handlers = useTripPlannerHandlers({
    directionsControl,
    originName: integratedState.route.originName,
    destName: integratedState.route.destName,
    waypoints: integratedState.route.waypoints,
    setSuggestions: integratedState.setSuggestions,
    saveTripData: integratedState.saveTripData,
    routeProfile: integratedState.travelMode,
    mode: integratedState.mode,
    tripId: integratedState.tripId,
    setTripId: integratedState.setTripId,
  });

  const generateItinerary = async () => {
    if (!integratedState.route.originName || !integratedState.route.destName) return;
    try {
      const itin = await ItineraryService.generate(
        integratedState.route.originName,
        integratedState.route.destName,
        Math.max(1, integratedState.route.waypoints.length + 1),
        ['sightseeing']
      );
      setItinerary(itin);
    } catch (err) {
      console.error('Itinerary generation failed', err);
      toast({
        title: 'Itinerary Error',
        description: 'Could not generate itinerary',
        variant: 'destructive',
      });
    }
  };

  // Use the proven working submit handler from handlers
  const handleSubmitTrip = handlers.handleSubmitTrip;

  return (
    <PAMProvider>
      <TripPlannerLayout>
        {/* Header */}
        <TripPlannerHeader isOffline={effectiveOfflineMode} tokenMissing={mapUnavailable} />

        {/* Offline Banner */}
        {effectiveOfflineMode && <OfflineTripBanner />}

        {/* Trip Controls */}
        <TripPlannerControls
          directionsControl={directionsControl}
          originName={integratedState.route.originName}
          destName={integratedState.route.destName}
          setOriginName={integratedState.setOriginName}
          setDestName={integratedState.setDestName}
          travelMode={integratedState.travelMode}
          setTravelMode={integratedState.setTravelMode}
          exclude={integratedState.exclude}
          setExclude={integratedState.setExclude}
          annotations={integratedState.annotations}
          setAnnotations={integratedState.setAnnotations}
          vehicle={integratedState.vehicle}
          setVehicle={integratedState.setVehicle}
          mode={integratedState.mode}
          setMode={integratedState.setMode}
          adding={integratedState.adding}
          setAdding={integratedState.setAdding}
          onSubmitTrip={handleSubmitTrip}
          map={map}
          isOffline={effectiveOfflineMode}
          originLocked={integratedState.originLocked}
          destinationLocked={integratedState.destinationLocked}
          lockOrigin={integratedState.lockOrigin}
          lockDestination={integratedState.lockDestination}
          routeType={integratedState.routeType}
          setRouteType={integratedState.setRouteType}
          manualMode={integratedState.manualMode}
          setManualMode={integratedState.setManualMode}
        />

        {/* Locked Point Controls */}
        {(integratedState.originLocked || integratedState.destinationLocked) && (
          <LockedPointControls
            originLocked={integratedState.originLocked}
            destinationLocked={integratedState.destinationLocked}
            originName={integratedState.route.originName}
            destName={integratedState.route.destName}
            onUnlockOrigin={integratedState.unlockOrigin}
            onUnlockDestination={integratedState.unlockDestination}
          />
        )}

        {/* Map Container - Now using MapControls component */}
        {mapUnavailable ? (
          <MapUnavailable />
        ) : !effectiveOfflineMode ? (
          <MapControls
            region={region}
            waypoints={integratedState.route.waypoints}
            setWaypoints={integratedState.setWaypoints}
            adding={integratedState.adding}
            setAdding={integratedState.setAdding}
            setOriginName={integratedState.setOriginName}
            setDestName={integratedState.setDestName}
            onRouteChange={handlers.handleRouteChange || (() => {})}
            directionsControl={directionsControl}
            originName={integratedState.route.originName}
            destName={integratedState.route.destName}
            travelMode={integratedState.travelMode}
            onTravelModeChange={integratedState.setTravelMode}
            exclude={integratedState.exclude}
            annotations={integratedState.annotations}
            vehicle={integratedState.vehicle}
            map={map}
            isOffline={effectiveOfflineMode}
            originLocked={integratedState.originLocked}
            destinationLocked={integratedState.destinationLocked}
            lockOrigin={integratedState.lockOrigin}
            lockDestination={integratedState.lockDestination}
            routeType={integratedState.routeType}
            manualMode={integratedState.manualMode}
            manualWaypoints={integratedState.manualWaypoints}
            onManualWaypointAdd={integratedState.addManualWaypoint}
            onManualWaypointRemove={integratedState.removeManualWaypoint}
          />
        ) : (
          <div className="h-[60vh] lg:h-[70vh] relative">
            <div className="overflow-hidden rounded-lg border h-full bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="h-full flex flex-col">
                {/* Offline Header */}
                <div className="bg-blue-100/50 border-b border-blue-200 p-4">
                  <h3 className="font-medium text-blue-900 flex items-center gap-2">
                    📍 Offline Trip Planner
                  </h3>
                </div>

                {/* Offline Content */}
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center max-w-md">
                    <div className="text-6xl mb-4">🗺️</div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Plan Your Route</h4>
                    <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                      Use the route controls above to set your origin and destination. Your route
                      will be calculated and displayed when online.
                    </p>

                    {/* Current Route Display */}
                    <div className="bg-white rounded-lg p-4 shadow-sm border">
                      <div className="text-xs font-medium text-gray-500 mb-2">CURRENT ROUTE</div>
                      <div className="text-sm font-medium text-gray-800">
                        {integratedState.route.originName && integratedState.route.destName
                          ? `${integratedState.route.originName} → ${integratedState.route.destName}`
                          : 'No route set'}
                      </div>
                      {integratedState.route.waypoints.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {integratedState.route.waypoints.length} waypoints planned
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <TripStats directionsControl={directionsControl} />

        {/* Waypoints List */}
        {integratedState.route.waypoints.length > 0 && (
          <WaypointsList
            waypoints={integratedState.route.waypoints}
            setWaypoints={integratedState.setWaypoints}
            directionsControl={directionsControl}
          />
        )}

        {/* Suggestions Grid */}
        {integratedState.route.suggestions.length > 0 && (
          <SuggestionsGrid suggestions={integratedState.route.suggestions} />
        )}

        {itinerary && (
          <div className="space-y-4">
            {itinerary.days.map(day => (
              <div key={day.day} className="border p-2 rounded-md">
                <h4 className="font-semibold">Day {day.day}</h4>
                <ul className="list-disc pl-5 text-sm">
                  {day.stops.map((stop, idx) => (
                    <li key={idx}>{stop.name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </TripPlannerLayout>
    </PAMProvider>
  );
}