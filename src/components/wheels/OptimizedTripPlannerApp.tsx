import React, { useState, useEffect, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Route, 
  Users, 
  DollarSign,
  Star,
  Sparkles,
  Play,
  ChevronRight,
  X,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Import lightweight components immediately
import {
  BudgetSidebar,
  SocialSidebar,
  SocialTripCoordinator,
  NavigationExportHub,
  TripPlannerHeader
} from './trip-planner/LazyMapComponents';

// Import lazy loaded heavy components
import { LazyIntegratedTripPlanner } from './trip-planner/LazyMapComponents';

// Import other essentials
import { useIntegratedTripState } from './trip-planner/hooks/useIntegratedTripState';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRegion } from '@/context/RegionContext';
import { getLocationBasedTripTemplates, incrementTemplateUsage, TripTemplate as ServiceTripTemplate } from '@/services/tripTemplateService';
import { usePerformanceMonitor, PerformanceOverlay } from '@/components/common/PerformanceMonitor';
import { preloadMapbox } from '@/utils/mapboxLoader';

type TripTemplate = ServiceTripTemplate;

// Loading component for map
const MapLoadingFallback = () => (
  <div className="flex items-center justify-center h-[400px] bg-gray-50 rounded-lg">
    <div className="text-center space-y-3">
      <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
      <p className="text-sm text-gray-600">Loading map...</p>
    </div>
  </div>
);

export default function OptimizedTripPlannerApp() {
  const auth = useAuth();
  const { toast } = useToast();
  const { region } = useRegion();
  
  const user = auth?.user || null;
  const [activeTab, setActiveTab] = useState('trip-templates');
  const [isPlannerInitialized, setIsPlannerInitialized] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TripTemplate | null>(null);
  const [showWelcome, setShowWelcome] = useState(!auth?.user);
  const [tripTemplates, setTripTemplates] = useState<TripTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showPerformance] = useState(() => localStorage.getItem('showPerformance') === 'true');
  
  // Initialize integrated state
  const integratedState = useIntegratedTripState(false);
  
  // Performance monitoring
  const { metrics, recordMapLoadTime } = usePerformanceMonitor('TripPlanner');

  // Load templates based on user region
  useEffect(() => {
    const loadTemplates = async () => {
      setTemplatesLoading(true);
      setTemplatesError(null);
      
      try {
        const templates = await getLocationBasedTripTemplates(region);
        setTripTemplates(templates);
      } catch (error) {
        console.error('Failed to load trip templates:', error);
        setTemplatesError('Failed to load trip suggestions. Please try again later.');
      } finally {
        setTemplatesLoading(false);
      }
    };

    loadTemplates();
  }, [region]);

  // Preload map when user hovers over planner tab
  const handlePlannerTabHover = () => {
    if (!mapLoaded) {
      // Start preloading Mapbox resources
      preloadMapbox();
      // Don't set mapLoaded yet - wait for actual usage
    }
  };

  useEffect(() => {
    if (user && showWelcome) {
      setShowWelcome(false);
    }
  }, [user, showWelcome]);

  const handleUseTemplate = async (template: TripTemplate) => {
    setSelectedTemplate(template);
    
    // Increment usage count
    await incrementTemplateUsage(template.id);
    
    // Pre-populate the trip planner with template data
    integratedState.setBudget(prev => ({
      ...prev,
      totalBudget: template.suggestedBudget,
      dailyBudget: Math.round(template.suggestedBudget / template.estimatedDays)
    }));

    // If template has route data, populate the map
    if (template.route) {
      const { origin, destination, waypoints } = template.route;

      if (origin) {
        integratedState.setOriginName(origin.name);
      }

      if (destination) {
        integratedState.setDestName(destination.name);
      }

      if (waypoints && waypoints.length > 0) {
        const waypointNames = waypoints.map(wp => wp.name);
        integratedState.setWaypointNames(waypointNames);
      }
    }
    
    // Switch to planner tab
    setActiveTab('planner');
    setIsPlannerInitialized(true);
    setMapLoaded(true); // Ensure map loads when template is used
    
    toast({
      title: "Template Applied",
      description: `Starting your ${template.title} planning!`,
    });
  };

  const handleStartPlanning = () => {
    setActiveTab('planner');
    setIsPlannerInitialized(true);
    setMapLoaded(true); // Load map when starting planning
  };

  // Welcome screen for non-authenticated users
  if (showWelcome) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center pb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Route className="h-10 w-10 text-blue-600" />
          </div>
          <CardTitle className="text-3xl font-bold mb-2">Welcome to Trip Planner</CardTitle>
          <p className="text-gray-600">Plan your perfect RV adventure with smart routing and budgeting</p>
        </CardHeader>
        <CardContent className="text-center pb-8">
          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-center space-x-2 text-gray-700">
              <Route className="h-5 w-5 text-blue-600" />
              <span>Optimized RV routes with campground stops</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-gray-700">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span>Smart budget tracking for fuel and stays</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-gray-700">
              <Users className="h-5 w-5 text-purple-600" />
              <span>Connect with fellow travelers on your route</span>
            </div>
          </div>
          <Button 
            size="lg" 
            className="px-8"
            onClick={() => setShowWelcome(false)}
          >
            <Play className="mr-2 h-5 w-5" />
            Start Planning
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="trip-templates" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Trip Ideas
          </TabsTrigger>
          <TabsTrigger 
            value="planner" 
            className="gap-2"
            onMouseEnter={handlePlannerTabHover}
            onFocus={handlePlannerTabHover}
          >
            <Route className="h-4 w-4" />
            Trip Planner
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-2">
            <Users className="h-4 w-4" />
            Social
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trip-templates" className="flex-1 overflow-auto">
          <div className="space-y-4">
            {/* Template content here - lightweight, no map dependencies */}
            {templatesLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="h-48 bg-gray-100" />
                  </Card>
                ))}
              </div>
            ) : templatesError ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-red-600">{templatesError}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {tripTemplates.map((template) => (
                  <Card 
                    key={template.id} 
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => handleUseTemplate(template)}
                  >
                    {/* Template card content */}
                    <CardHeader>
                      <CardTitle>{template.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                      <Button size="sm">Use Template</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="planner" className="flex-1 flex">
          <div className="flex gap-4 h-full">
            <div className="flex-1">
              {!isPlannerInitialized ? (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="text-center space-y-4">
                    <Route className="h-16 w-16 text-gray-400 mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Ready to Plan Your Trip?</h3>
                      <p className="text-gray-600 mb-4">Start from scratch or choose a template to begin</p>
                    </div>
                    <Button onClick={handleStartPlanning} size="lg">
                      <Play className="mr-2 h-5 w-5" />
                      Start Planning
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4 h-full">
                  {selectedTemplate && (
                    <Card className="p-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Template</Badge>
                          <span className="text-sm font-medium">{selectedTemplate.title}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedTemplate(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  )}
                  
                  {/* Only load map when needed */}
                  {mapLoaded ? (
                    <Suspense fallback={<MapLoadingFallback />}>
                      <LazyIntegratedTripPlanner
                        budget={integratedState.budget}
                        setBudget={integratedState.setBudget}
                        friends={integratedState.friends}
                        setFriends={integratedState.setFriends}
                        originName={integratedState.originName}
                        setOriginName={integratedState.setOriginName}
                        destName={integratedState.destName}
                        setDestName={integratedState.setDestName}
                        waypointNames={integratedState.waypointNames}
                        setWaypointNames={integratedState.setWaypointNames}
                        templateRoute={selectedTemplate?.route}
                        onMapLoaded={recordMapLoadTime}
                      />
                    </Suspense>
                  ) : (
                    <MapLoadingFallback />
                  )}
                </div>
              )}
            </div>
            
            <div className="w-80 space-y-4">
              <BudgetSidebar 
                budget={integratedState.budget}
                onBudgetChange={integratedState.setBudget}
              />
              
              <SocialSidebar 
                friends={integratedState.friends}
                onFriendsChange={integratedState.setFriends}
              />
              
              <NavigationExportHub 
                originName={integratedState.originName}
                destName={integratedState.destName}
                waypointNames={integratedState.waypointNames}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="social" className="flex-1">
          <SocialTripCoordinator 
            friends={integratedState.friends}
            onFriendsChange={integratedState.setFriends}
          />
        </TabsContent>
      </Tabs>
      
      {/* Performance monitoring overlay for development */}
      <PerformanceOverlay metrics={metrics} show={showPerformance} />
    </div>
  );
}