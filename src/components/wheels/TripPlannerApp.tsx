/**
 * IMPORTANT: This Trip Planner component is SACROSANCT and must NOT be modified
 * without explicit permission from the project owner. Any optimizations, 
 * refactoring, or changes require direct approval.
 * 
 * DO NOT:
 * - Add performance optimizations
 * - Refactor the code structure
 * - Add lazy loading
 * - Modify the UI/UX
 * - Change any functionality
 * 
 * This component works exactly as intended.
 */
import React, { useState, useEffect, useRef } from 'react';
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
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Import existing components
import IntegratedTripPlanner from './trip-planner/IntegratedTripPlanner';
import BudgetSidebar from './trip-planner/BudgetSidebar';
import SocialSidebar from './trip-planner/SocialSidebar';
import SocialTripCoordinator from './trip-planner/SocialTripCoordinator';
import NavigationExportHub from './trip-planner/NavigationExportHub';
import TripTemplates from './TripTemplates';
import { useIntegratedTripState } from './trip-planner/hooks/useIntegratedTripState';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { incrementTemplateUsage, TripTemplate as ServiceTripTemplate } from '@/services/tripTemplateService';

// Use the service interface
type TripTemplate = ServiceTripTemplate;

// Remove static templates - will be loaded dynamically based on user's region

export default function TripPlannerApp() {
  const auth = useAuth();
  const { toast } = useToast();
  
  // Handle case where auth context might not be available
  const user = auth?.user || null;
  const [activeTab, setActiveTab] = useState('trip-templates');
  const [isPlannerInitialized, setIsPlannerInitialized] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TripTemplate | null>(null);
  const [showWelcome, setShowWelcome] = useState(!auth?.user);
  
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
            <TabsList className="grid grid-cols-2 w-full sm:w-auto">
              <TabsTrigger value="trip-templates" className="flex items-center gap-2 text-xs sm:text-sm">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Plan Your Trip</span>
                <span className="sm:hidden">Plan Trip</span>
              </TabsTrigger>
              <TabsTrigger value="plan-trip" className="flex items-center gap-2 text-xs sm:text-sm">
                <Route className="w-4 h-4" />
                <span className="hidden sm:inline">Trip Map Planner</span>
                <span className="sm:hidden">Map</span>
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
            <TripTemplates onUseTemplate={handleUseTemplate} />
          </TabsContent>

          <TabsContent value="plan-trip" className="mt-0">
            <IntegratedTripPlanner templateData={selectedTemplate} />
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