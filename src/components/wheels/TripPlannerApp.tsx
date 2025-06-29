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
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Import existing components
import TripPlanner from './TripPlanner';
import BudgetSidebar from './trip-planner/BudgetSidebar';
import SocialSidebar from './trip-planner/SocialSidebar';
import SocialTripCoordinator from './trip-planner/SocialTripCoordinator';
import NavigationExportHub from './trip-planner/NavigationExportHub';
import { useIntegratedTripState } from './trip-planner/hooks/useIntegratedTripState';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface TripTemplate {
  id: string;
  name: string;
  description: string;
  estimatedDays: number;
  estimatedMiles: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  highlights: string[];
  suggestedBudget: number;
  route: any;
}

const TRIP_TEMPLATES: TripTemplate[] = [
  {
    id: 'southwest-loop',
    name: 'Southwest National Parks Loop',
    description: 'Classic tour of the Big 5 national parks in Utah and Arizona',
    estimatedDays: 14,
    estimatedMiles: 1850,
    difficulty: 'intermediate',
    highlights: ['Zion', 'Bryce Canyon', 'Capitol Reef', 'Arches', 'Canyonlands'],
    suggestedBudget: 2200,
    route: null
  },
  {
    id: 'pacific-coast',
    name: 'Pacific Coast Highway',
    description: 'Stunning coastal drive from San Francisco to San Diego',
    estimatedDays: 10,
    estimatedMiles: 1200,
    difficulty: 'beginner',
    highlights: ['Big Sur', 'Monterey', 'Santa Barbara', 'Malibu'],
    suggestedBudget: 1800,
    route: null
  },
  {
    id: 'great-lakes',
    name: 'Great Lakes Circle Tour',
    description: 'Complete loop around all five Great Lakes',
    estimatedDays: 21,
    estimatedMiles: 2800,
    difficulty: 'advanced',
    highlights: ['Mackinac Island', 'Apostle Islands', 'Sleeping Bear Dunes'],
    suggestedBudget: 3200,
    route: null
  }
];

export default function TripPlannerApp() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('plan-trip');
  const [isPlannerInitialized, setIsPlannerInitialized] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TripTemplate | null>(null);
  const [showWelcome, setShowWelcome] = useState(!user);
  
  // Initialize integrated state
  const integratedState = useIntegratedTripState(false);

  useEffect(() => {
    if (user && showWelcome) {
      setShowWelcome(false);
    }
  }, [user, showWelcome]);

  const handleUseTemplate = (template: TripTemplate) => {
    setSelectedTemplate(template);
    // Pre-populate the trip planner with template data
    integratedState.setBudget(prev => ({
      ...prev,
      totalBudget: template.suggestedBudget,
      dailyBudget: Math.round(template.suggestedBudget / template.estimatedDays)
    }));
    
    toast({
      title: "Template Applied",
      description: `${template.name} has been loaded. Customize it to your needs!`
    });
    
    setActiveTab('plan-trip');
    setIsPlannerInitialized(true);
  };

  const TripTemplatesContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Trip Templates</h2>
          <p className="text-muted-foreground">Start with proven RV routes and customize to your needs</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {TRIP_TEMPLATES.map((template) => (
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
              
              <Button 
                className="w-full" 
                onClick={() => handleUseTemplate(template)}
              >
                Use This Template
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const TripDetailsContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Trip Details</h2>
          <p className="text-muted-foreground">Review and finalize your trip information</p>
        </div>
      </div>

      {/* Trip Summary */}
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
            
            {(integratedState.route.originName || integratedState.route.destName) && (
              <div className="space-y-3 pt-4 border-t">
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
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export & Share</CardTitle>
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
            <TripPlanner />
          <PAMTripIntegration />
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