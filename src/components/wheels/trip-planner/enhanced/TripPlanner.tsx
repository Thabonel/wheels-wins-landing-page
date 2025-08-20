import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Route, Map as MapIcon } from 'lucide-react';
import TripMap from './TripMap';
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
    planTrip
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
          <TripMap 
            startLocation={startLocation}
            endLocation={endLocation}
            userLocation={userCoordinates}
            waypoints={tripPlan?.waypoints}
            currentRoute={tripPlan?.route}
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
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Trip Summary</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Route:</strong> {tripPlan.title}</p>
              <p><strong>Distance:</strong> {tripPlan.distance} miles</p>
              <p><strong>Duration:</strong> {tripPlan.duration} days</p>
              <p><strong>Difficulty:</strong> {tripPlan.difficulty}</p>
              {tripPlan.terrainTypes.length > 0 && (
                <p><strong>Road Types:</strong> {tripPlan.terrainTypes.join(', ')}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TripPlanner;