import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Route, 
  Users, 
  MessageSquare, 
  DollarSign,
  Download,
  Settings,
  MapPin,
  Clock,
  Star,
  Sparkles,
  Play,
  Pause,
  ChevronRight,
  X,
  Share,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Import existing components
import IntegratedTripPlanner from './trip-planner/IntegratedTripPlanner';
import BudgetSidebar from './trip-planner/BudgetSidebar';
import SocialSidebar from './trip-planner/SocialSidebar';
import SocialTripCoordinator from './trip-planner/SocialTripCoordinator';
import NavigationExportHub from './trip-planner/NavigationExportHub';
import { useIntegratedTripState } from './trip-planner/hooks/useIntegratedTripState';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRegion } from '@/context/RegionContext';
import { getLocationBasedTripTemplates, incrementTemplateUsage, TripTemplate as ServiceTripTemplate } from '@/services/tripTemplateService';

// Use the service interface
type TripTemplate = ServiceTripTemplate;

// Remove static templates - will be loaded dynamically based on user's region

export default function TripPlannerApp() {
  const auth = useAuth();
  const { toast } = useToast();
  const { region } = useRegion();
  
  // Handle case where auth context might not be available
  const user = auth?.user || null;
  const [activeTab, setActiveTab] = useState('trip-templates');
  const [isPlannerInitialized, setIsPlannerInitialized] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TripTemplate | null>(null);
  const [showWelcome, setShowWelcome] = useState(!auth?.user);
  const [tripTemplates, setTripTemplates] = useState<TripTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  
  // Initialize integrated state
  const integratedState = useIntegratedTripState(false);

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
      try {
        console.log('🗺️ Loading template route:', template.route);

        // Extract route data from template
        const { origin, destination, waypoints } = template.route;

        if (origin) {
          console.log('🅰️ Setting template origin:', origin.name);
          integratedState.setOriginName(origin.name);
          
          // Store coordinates for later use by map
          // Store origin coords for template usage (route state is handled by map component)
        }

        if (destination) {
          console.log('🅱️ Setting template destination:', destination.name);
          integratedState.setDestName(destination.name);
          
          // Store coordinates for later use by map
          // Store destination coords for template usage (route state is handled by map component)
        }

        if (waypoints && waypoints.length > 0) {
          console.log('📍 Setting template waypoints:', waypoints.length);
          
          // Convert template waypoints to the expected format
          const formattedWaypoints = waypoints.map((wp: any, index: number) => ({
            coords: wp.coords as [number, number],
            name: wp.name || `Stop ${index + 1}`
          }));
          
          integratedState.setWaypoints(formattedWaypoints);
        }

        // Set template metadata
        // Store template metadata (route display is handled by integrated state)

      } catch (error) {
        console.error('Error loading template route:', error);
        toast({
          title: "Template Loaded",
          description: `${template.name} has been loaded, but route data couldn't be applied. You can manually set your route.`,
          variant: "destructive"  
        });
      }
    }
    
    toast({
      title: "Template Applied",
      description: `${template.name} has been loaded. ${template.route ? 'Route and waypoints have been set on the map.' : 'Customize it to your needs!'}`
    });
    
    setActiveTab('plan-trip');
    setIsPlannerInitialized(true);
  };

  // Load trip templates based on user's region
  useEffect(() => {
    async function loadTripTemplates() {
      try {
        setTemplatesLoading(true);
        setTemplatesError(null);
        
        console.log(`Loading trip templates for region: ${region}`);
        const templates = await getLocationBasedTripTemplates(region);
        
        setTripTemplates(templates);
        
        if (templates.length === 0) {
          setTemplatesError('No trip templates available for your region. Our scraper is working to find some!');
        }
      } catch (error) {
        console.error('Error loading trip templates:', error);
        setTemplatesError('Failed to load trip templates. Please try refreshing the page.');
      } finally {
        setTemplatesLoading(false);
      }
    }

    loadTripTemplates();
  }, [region]);

  const TripTemplatesContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Trip Templates</h2>
          <p className="text-muted-foreground">Start with proven RV routes and customize to your needs</p>
        </div>
      </div>

      {templatesLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading trip templates for {region}...</p>
        </div>
      )}

      {templatesError && (
        <div className="text-center py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">{templatesError}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 text-yellow-600 underline hover:text-yellow-700"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {!templatesLoading && !templatesError && tripTemplates.length > 0 && (
        <>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>📍 {region} Templates:</strong> Showing {tripTemplates.length} trip templates for your region.
              {tripTemplates.some(t => t.createdBy === 'auto-scraper') && ' Some templates were automatically discovered and curated for you!'}
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tripTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={
                      template.difficulty === 'beginner' ? 'secondary' : 
                      template.difficulty === 'intermediate' ? 'default' : 'destructive'
                    }>
                      {template.difficulty}
                    </Badge>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={cn(
                            "w-3 h-3",
                            i < (template.difficulty === 'beginner' ? 3 : template.difficulty === 'intermediate' ? 4 : 5)
                              ? "text-yellow-400 fill-current" 
                              : "text-gray-300"
                          )} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{template.description}</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{template.estimatedDays} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Distance:</span>
                  <span className="font-medium">{template.estimatedMiles.toLocaleString()} miles</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Suggested Budget:</span>
                  <span className="font-medium">${template.suggestedBudget.toLocaleString()}</span>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium mb-2">Highlights:</div>
                <div className="flex flex-wrap gap-1">
                  {template.highlights.slice(0, 3).map((highlight) => (
                    <Badge key={highlight} variant="outline" className="text-xs">
                      {highlight}
                    </Badge>
                  ))}
                  {template.highlights.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{template.highlights.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  className="flex-1" 
                  onClick={() => handleUseTemplate(template)}
                >
                  Use This Template
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
                {template.createdBy === 'auto-scraper' && (
                  <Badge variant="outline" className="text-xs px-2">
                    Auto
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
          ))}
          </div>
        </>
      )}
    </div>
  );

  const TripDetailsContent = () => {
    const [pastTrips, setPastTrips] = useState([]);
    const [loading, setLoading] = useState(false);

    // Mock past trips data - in real app this would come from database
    const mockPastTrips = [
      {
        id: '1',
        name: 'Coast to Coast Adventure',
        dates: { start: '2024-08-15', end: '2024-08-28' },
        destinations: ['Sydney', 'Melbourne', 'Adelaide', 'Perth'],
        duration: 14,
        thumbnail: '/placeholder.svg',
        highlights: ['Great Ocean Road', 'Nullarbor Plain', 'Uluru']
      },
      {
        id: '2', 
        name: 'Queensland Explorer',
        dates: { start: '2024-06-10', end: '2024-06-17' },
        destinations: ['Brisbane', 'Gold Coast', 'Cairns'],
        duration: 7,
        thumbnail: '/placeholder.svg',
        highlights: ['Great Barrier Reef', 'Daintree Rainforest']
      }
    ];

    const handleShareTrip = async (trip) => {
      setLoading(true);
      try {
        // In real app, this would create a social post
        const shareData = {
          title: `Check out my ${trip.name} trip!`,
          text: `Just completed an amazing ${trip.duration}-day journey through ${trip.destinations.join(', ')}. Highlights included ${trip.highlights.join(', ')}.`,
          url: `${window.location.origin}/trip/${trip.id}`
        };
        
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          await navigator.clipboard.writeText(shareData.url);
          // Show toast notification here
        }
      } catch (error) {
        console.error('Error sharing trip:', error);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Trip Details</h2>
            <p className="text-muted-foreground">Review and manage your travel experiences</p>
          </div>
        </div>

        {/* Current Trip Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="w-5 h-5" />
              Current Trip Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {integratedState.route.waypoints.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Waypoints</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-success">
                    ${integratedState.budget.totalBudget}
                  </div>
                  <div className="text-sm text-muted-foreground">Budget</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-warning">
                    {integratedState.social.friends.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Friends</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-info">
                    {integratedState.pam.suggestions.length}
                  </div>
                  <div className="text-sm text-muted-foreground">AI Tips</div>
                </div>
              </div>
              
              {/* Detailed Route Information */}
              {(integratedState.route.originName || integratedState.route.destName) && (
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="font-semibold">Route Details</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {integratedState.route.originName || 'Set origin'} → {integratedState.route.destName || 'Set destination'}
                    </span>
                  </div>
                  
                  {integratedState.route.totalDistance && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {integratedState.route.totalDistance} miles • {integratedState.route.estimatedTime} hours
                      </span>
                    </div>
                  )}

                  {/* Waypoints List */}
                  {integratedState.route.waypoints.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">Planned Stops:</h5>
                      <div className="grid gap-2">
                        {integratedState.route.waypoints.map((waypoint, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm bg-muted/20 p-2 rounded">
                            <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">
                              {index + 1}
                            </div>
                            <span>{waypoint.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Travel Preferences */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <span className="text-sm text-muted-foreground">Travel Mode:</span>
                      <div className="font-medium capitalize">{integratedState.travelMode}</div>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Vehicle:</span>
                      <div className="font-medium capitalize">{integratedState.vehicle}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Past Trips Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Past Trips
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mockPastTrips.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No past trips yet. Complete your first trip to see it here!</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {mockPastTrips.map((trip) => (
                  <Card key={trip.id} className="overflow-hidden">
                    <div className="aspect-video bg-muted relative">
                      <img 
                        src={trip.thumbnail} 
                        alt={trip.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary">
                          {trip.duration} days
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold">{trip.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(trip.dates.start).toLocaleDateString()} - {new Date(trip.dates.end).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium mb-1">Destinations:</p>
                          <p className="text-sm text-muted-foreground">
                            {trip.destinations.join(' → ')}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm font-medium mb-1">Highlights:</p>
                          <div className="flex flex-wrap gap-1">
                            {trip.highlights.map((highlight, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {highlight}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleShareTrip(trip)}
                            disabled={loading}
                          >
                            <Share className="w-3 h-3 mr-1" />
                            Share
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              // Navigate to full trip details
                              console.log('View details for trip:', trip.id);
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export Options */}
        <Card>
          <CardHeader>
            <CardTitle>Export & Share Current Trip</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button onClick={() => integratedState.toggleFeature('export')}>
                <Download className="w-4 h-4 mr-2" />
                Export Trip
              </Button>
              <Button variant="outline" onClick={() => integratedState.toggleFeature('meetup')}>
                <Users className="w-4 h-4 mr-2" />
                Plan My Meetup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Welcome screen for non-authenticated users
  if (showWelcome) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold mb-4">
                Plan Your Perfect <span className="text-primary">RV Adventure</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                AI-powered trip planning with social coordination and budget optimization
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid md:grid-cols-3 gap-6 mb-12"
            >
              <Card className="p-6">
                <Route className="w-8 h-8 text-primary mb-4 mx-auto" />
                <h3 className="font-semibold mb-2">Smart Route Planning</h3>
                <p className="text-sm text-muted-foreground">
                  AI-optimized routes considering RV restrictions, scenic value, and budget
                </p>
              </Card>
              <Card className="p-6">
                <Users className="w-8 h-8 text-primary mb-4 mx-auto" />
                <h3 className="font-semibold mb-2">Social Coordination</h3>
                <p className="text-sm text-muted-foreground">
                  Plan group trips, find friends along your route, and coordinate meetups
                </p>
              </Card>
              <Card className="p-6">
                <Sparkles className="w-8 h-8 text-primary mb-4 mx-auto" />
                <h3 className="font-semibold mb-2">PAM AI Assistant</h3>
                <p className="text-sm text-muted-foreground">
                  Get personalized recommendations and real-time trip optimization
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="space-y-4"
            >
              <Button size="lg" className="text-lg px-8 py-3" onClick={() => setShowWelcome(false)}>
                <Play className="w-5 h-5 mr-2" />
                Try Free Demo
              </Button>
              <p className="text-sm text-muted-foreground">
                No account required • Full features available
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <TabsList className="grid grid-cols-3 w-full sm:w-auto">
              <TabsTrigger value="trip-templates" className="flex items-center gap-2 text-xs sm:text-sm">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Trip Templates</span>
                <span className="sm:hidden">Templates</span>
              </TabsTrigger>
              <TabsTrigger value="plan-trip" className="flex items-center gap-2 text-xs sm:text-sm">
                <Route className="w-4 h-4" />
                <span className="hidden sm:inline">Plan Trip</span>
                <span className="sm:hidden">Plan</span>
              </TabsTrigger>
              <TabsTrigger value="trip-details" className="flex items-center gap-2 text-xs sm:text-sm">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Trip Details</span>
                <span className="sm:hidden">Details</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Budget and Social Buttons - Clean state management */}
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:gap-2">
              <Button
                size="sm"
                variant={integratedState.ui.showBudgetSidebar ? "default" : "outline"}
                onClick={() => {
                  // Close social if open, then toggle budget
                  if (integratedState.ui.showSocialSidebar) {
                    integratedState.toggleFeature('social');
                  }
                  integratedState.toggleFeature('budget');
                }}
                className="flex-1 sm:flex-initial"
              >
                <DollarSign className="w-4 h-4 mr-1" />
                Budget
              </Button>
              <Button
                size="sm"
                variant={integratedState.ui.showSocialSidebar ? "default" : "outline"}
                onClick={() => {
                  // Close budget if open, then toggle social
                  if (integratedState.ui.showBudgetSidebar) {
                    integratedState.toggleFeature('budget');
                  }
                  integratedState.toggleFeature('social');
                }}
                className="flex-1 sm:flex-initial"
              >
                <Users className="w-4 h-4 mr-1" />
                Social
              </Button>
            </div>
          </div>

          <TabsContent value="trip-templates" className="mt-0">
            <TripTemplatesContent />
          </TabsContent>

          <TabsContent value="plan-trip" className="mt-0">
            <IntegratedTripPlanner templateData={selectedTemplate} />
          </TabsContent>

          <TabsContent value="trip-details" className="mt-0">
            <TripDetailsContent />
          </TabsContent>
        </Tabs>

        {/* Sidebar Rendering - ONLY here, nowhere else */}
        {(integratedState.ui.showBudgetSidebar || integratedState.ui.showSocialSidebar) && (
          <>
            {/* Mobile Overlay */}
            <div 
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => {
                if (integratedState.ui.showBudgetSidebar) {
                  integratedState.toggleFeature('budget');
                }
                if (integratedState.ui.showSocialSidebar) {
                  integratedState.toggleFeature('social');
                }
              }}
            />
            
            {/* Responsive Sidebar */}
            <div className={`
              fixed inset-y-0 right-0 z-50 w-full sm:w-80 md:w-96 
              bg-background border-l shadow-lg overflow-y-auto
              transform transition-transform duration-300 ease-in-out
              ${(integratedState.ui.showBudgetSidebar || integratedState.ui.showSocialSidebar) 
                ? 'translate-x-0' 
                : 'translate-x-full'
              }
            `}>
              <div className="p-4 space-y-4">
                {/* Budget Sidebar */}
                {integratedState.ui.showBudgetSidebar && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Trip Budget Tracker</h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => integratedState.toggleFeature('budget')}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <BudgetSidebar 
                      isVisible={true} 
                      onClose={() => integratedState.toggleFeature('budget')} 
                    />
                  </div>
                )}

                {/* Social Sidebar */}
                {integratedState.ui.showSocialSidebar && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Social Trip Coordination</h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => integratedState.toggleFeature('social')}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <SocialSidebar
                      friends={integratedState.social.friends}
                      groupTrips={integratedState.social.groupTrips}
                      onOpenMeetupPlanner={() => {
                        if (integratedState.ui.showSocialSidebar) {
                          integratedState.toggleFeature('social');
                        }
                        if (!integratedState.ui.showMeetupPlanner) {
                          integratedState.toggleFeature('meetup');
                        }
                      }}
                      isOpen={true}
                      onClose={() => integratedState.toggleFeature('social')}
                      calendarEvents={[]}
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Plan My Meetup Modal */}
        <SocialTripCoordinator
          isOpen={integratedState.ui.showMeetupPlanner}
          onClose={() => integratedState.toggleFeature('meetup')}
          currentRoute={integratedState.route}
          currentBudget={integratedState.budget}
        />

        <NavigationExportHub
          isOpen={integratedState.ui.showExportModal}
          onClose={() => integratedState.toggleFeature('export')}
          currentRoute={integratedState.route}
          currentBudget={integratedState.budget}
        />
      </div>
    </div>
  );
}