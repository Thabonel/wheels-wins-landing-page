import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Route, Map as MapIcon } from 'lucide-react';
import EnhancedTripMap from './EnhancedTripMap';
import { useTripPlanning } from './hooks/use-trip-planning';
import { TripPlannerProps } from './types';
import RouteForm from './RouteForm';
import TerrainForm from './TerrainForm';
import PoiForm from './PoiForm';
import { useToast } from '@/hooks/use-toast';

const TripPlanner = ({ 
  onClose, 
  templateData, 
  integratedState, 
  onRouteUpdate, 
  onBudgetUpdate 
}: TripPlannerProps) => {
  const [activeTab, setActiveTab] = useState('route');
  const { toast } = useToast();
  
  const { 
    startLocation, 
    setStartLocation,
    endLocation, 
    setEndLocation,
    difficulty, 
    setDifficulty,
    selectedTerrainTypes, 
    setSelectedTerrainTypes,
    selectedPois,
    setSelectedPois,
    isPlanning,
    tripPlan,
    planTrip,
    // Enhanced routing features
    waypoints,
    routes,
    mainRoute,
    alternativeRoutes,
    addWaypoint,
    removeWaypoint,
    switchToAlternativeRoute,
    isCalculatingRoute,
    routeError,
    hasRoutes
  } = useTripPlanning();
  
  // Apply template data when provided
  useEffect(() => {
    if (templateData) {
      // Apply route data if available
      if (templateData.route?.origin?.name) {
        setStartLocation(templateData.route.origin.name);
      }
      if (templateData.route?.destination?.name) {
        setEndLocation(templateData.route.destination.name);
      }
      
      // Set appropriate difficulty based on template type
      if (templateData.difficulty) {
        setDifficulty(templateData.difficulty);
      } else {
        setDifficulty('moderate'); // Default for RV travel
      }
      
      // Set terrain types based on template or use RV-friendly defaults
      if (templateData.terrainTypes?.length > 0) {
        setSelectedTerrainTypes(templateData.terrainTypes);
      } else {
        setSelectedTerrainTypes(['highways', 'scenic_routes']);
      }
      
      // Set POI types based on template or use RV defaults
      if (templateData.poiTypes?.length > 0) {
        setSelectedPois(templateData.poiTypes);
      } else {
        setSelectedPois(['rv_parks', 'fuel', 'groceries']);
      }
      
      // Log template application for debugging
      console.log('📋 Applied template to trip planner:', {
        name: templateData.name,
        route: templateData.route,
        difficulty: templateData.difficulty,
        terrainTypes: templateData.terrainTypes,
        poiTypes: templateData.poiTypes
      });
    }
  }, [templateData, setStartLocation, setEndLocation, setDifficulty, setSelectedTerrainTypes, setSelectedPois]);

  // Update integrated state when route changes
  useEffect(() => {
    if (tripPlan && onRouteUpdate) {
      onRouteUpdate({
        origin: startLocation,
        destination: endLocation,
        waypoints: tripPlan.waypoints || [],
        distance: tripPlan.distance,
        duration: tripPlan.duration
      });
    }
  }, [tripPlan, startLocation, endLocation, onRouteUpdate]);

  // Update budget when trip plan changes
  useEffect(() => {
    if (tripPlan && onBudgetUpdate) {
      // Calculate estimated budget based on trip plan
      const estimatedBudget = {
        totalBudget: tripPlan.distance * 2.5 + tripPlan.duration * 150, // Rough estimate
        dailyBudget: Math.round((tripPlan.distance * 2.5 + tripPlan.duration * 150) / tripPlan.duration)
      };
      onBudgetUpdate(estimatedBudget);
    }
  }, [tripPlan, onBudgetUpdate]);

  // Memoize user coordinates to prevent unnecessary re-renders
  const userCoordinates = useMemo(() => {
    // This would come from user profile or geolocation
    return undefined;
  }, []);

  const handlePlanTrip = async () => {
    const result = await planTrip();
    if (result) {
      toast({
        title: "Trip Planned Successfully!",
        description: `Your ${result.distance} mile journey is ready. Estimated duration: ${result.duration} days.`
      });
    } else {
      toast({
        title: "Planning Failed",
        description: "Please check your start and end locations.",
        variant: "destructive"
      });
    }
  };

  const handleTerrainChange = (terrain: string) => {
    if (selectedTerrainTypes.includes(terrain)) {
      setSelectedTerrainTypes(selectedTerrainTypes.filter((t) => t !== terrain));
    } else {
      setSelectedTerrainTypes([...selectedTerrainTypes, terrain]);
    }
  };

  const handlePoiChange = (poi: string) => {
    if (selectedPois.includes(poi)) {
      setSelectedPois(selectedPois.filter((p) => p !== poi));
    } else {
      setSelectedPois([...selectedPois, poi]);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <MapIcon className="mr-2 h-5 w-5" />
          RV Trip Planner
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="route" onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="route">Route</TabsTrigger>
            <TabsTrigger value="terrain">Roads</TabsTrigger>
            <TabsTrigger value="poi">Points of Interest</TabsTrigger>
          </TabsList>
          
          <TabsContent value="route" className="space-y-4">
            <RouteForm
              startLocation={startLocation}
              setStartLocation={setStartLocation}
              endLocation={endLocation}
              setEndLocation={setEndLocation}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
            />
          </TabsContent>
          
          <TabsContent value="terrain" className="space-y-4">
            <TerrainForm 
              selectedTerrainTypes={selectedTerrainTypes}
              handleTerrainChange={handleTerrainChange}
            />
          </TabsContent>
          
          <TabsContent value="poi" className="space-y-4">
            <PoiForm
              selectedPois={selectedPois}
              handlePoiChange={handlePoiChange}
            />
          </TabsContent>
        </Tabs>

        <div className="mt-6">
          <EnhancedTripMap 
            waypoints={waypoints}
            routes={routes}
            mainRoute={mainRoute}
            alternativeRoutes={alternativeRoutes}
            isCalculating={isCalculatingRoute}
            onRouteSelect={switchToAlternativeRoute}
            userLocation={userCoordinates}
            showRouteDetails={true}
            enableInteractiveMode={false}
          />
        </div>

        <div className="mt-6 flex justify-between">
          {onClose && (
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          )}
          <Button 
            onClick={handlePlanTrip} 
            disabled={isPlanning || !startLocation || !endLocation}
            className="ml-auto"
          >
            <Route className="mr-2 h-4 w-4" />
            {isPlanning ? 'Planning...' : 'Plan Route'}
          </Button>
        </div>

        {tripPlan && (
          <div className="mt-4 space-y-4">
            {/* Enhanced Trip Summary */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Route className="w-4 h-4" />
                Trip Summary
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2 text-sm">
                  <p><strong>Route:</strong> {tripPlan.title}</p>
                  <p><strong>Distance:</strong> {tripPlan.distance.toFixed(1)} km ({(tripPlan.distance * 0.621371).toFixed(1)} miles)</p>
                  <p><strong>Duration:</strong> {tripPlan.duration.toFixed(1)} hours</p>
                  <p><strong>Difficulty:</strong> {tripPlan.difficulty}</p>
                  {tripPlan.terrainTypes.length > 0 && (
                    <p><strong>Road Types:</strong> {tripPlan.terrainTypes.join(', ')}</p>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <p><strong>RV Suitability:</strong> 
                    <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      tripPlan.rvSuitability >= 80 ? 'bg-green-100 text-green-800' :
                      tripPlan.rvSuitability >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      tripPlan.rvSuitability >= 40 ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {tripPlan.rvSuitability}%
                    </span>
                  </p>
                  <p><strong>Route Confidence:</strong> {Math.round(tripPlan.confidence * 100)}%</p>
                  <p><strong>Waypoints:</strong> {tripPlan.waypoints.length}</p>
                  {tripPlan.routes.length > 1 && (
                    <p><strong>Alternatives:</strong> {tripPlan.routes.length - 1} available</p>
                  )}
                </div>
              </div>
            </div>

            {/* Alternative Routes Panel */}
            {alternativeRoutes.length > 0 && (
              <div className="p-4 bg-background border rounded-lg">
                <h4 className="font-medium mb-3">Alternative Routes</h4>
                <div className="space-y-2">
                  {alternativeRoutes.map((route, index) => (
                    <div 
                      key={route.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => switchToAlternativeRoute(route.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-1 rounded ${
                          route.provider === 'openroute' ? 'bg-purple-500' : 'bg-indigo-500'
                        }`}></div>
                        <div>
                          <div className="text-sm font-medium">Alternative {index + 1}</div>
                          <div className="text-xs text-muted-foreground">
                            {route.distance.toFixed(1)} km • {route.duration.toFixed(1)}h • RV: {route.rvSuitability}%
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">Switch</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Route Instructions */}
            {tripPlan.instructions.length > 0 && (
              <div className="p-4 bg-background border rounded-lg">
                <h4 className="font-medium mb-3">Turn-by-Turn Directions</h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {tripPlan.instructions.slice(0, 10).map((instruction, index) => (
                    <div key={index} className="text-sm p-2 bg-muted/30 rounded">
                      <span className="font-medium text-primary">{index + 1}.</span> {instruction}
                    </div>
                  ))}
                  {tripPlan.instructions.length > 10 && (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      ... and {tripPlan.instructions.length - 10} more directions
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Display */}
            {routeError && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <h4 className="font-medium text-destructive mb-2">Routing Error</h4>
                <p className="text-sm text-destructive/80">{routeError}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TripPlanner;