/**
 * Trip Planner App - Enhanced with robust Unimog-based architecture
 * 
 * Features:
 * - Clean, maintainable trip planning core
 * - Template system with enhanced integration
 * - Template system with enhanced integration
 * - Robust error handling and map integration
 * 
 * Architecture: Unimog trip planner core + Wheels & Wins integration layer
 */
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Route, 
  Star,
  Sparkles,
  Play,
  ChevronRight,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Import Fresh trip planner - the modern implementation
import FreshTripPlanner from './trip-planner/fresh/FreshTripPlanner';
import TripTemplates from './TripTemplates';
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
  
  // Check URL parameters for initial tab
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'trip-planner') {
      return 'plan-trip';
    }
    return 'trip-templates';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [isPlannerInitialized, setIsPlannerInitialized] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TripTemplate | null>(null);
  const [showWelcome, setShowWelcome] = useState(!auth?.user);
  
  // State for simplified integration
  const [routeData, setRouteData] = useState<any>(null);
  const [budgetData, setBudgetData] = useState<any>(null);

  useEffect(() => {
    if (user && showWelcome) {
      setShowWelcome(false);
    }
  }, [user, showWelcome]);

  // Check for template from sessionStorage when component mounts
  useEffect(() => {
    const templateData = sessionStorage.getItem('selectedTripTemplate');
    if (templateData) {
      try {
        const template = JSON.parse(templateData) as TripTemplate;
        console.log('📦 Loading template from sessionStorage:', template.name);
        
        // Clear the sessionStorage to prevent reloading on refresh
        sessionStorage.removeItem('selectedTripTemplate');
        
        // Apply the template
        handleUseTemplate(template);
      } catch (error) {
        console.error('Error loading template from sessionStorage:', error);
      }
    }
  }, []);

  const handleUseTemplate = async (template: TripTemplate) => {
    setSelectedTemplate(template);
    
    // Increment usage count
    await incrementTemplateUsage(template.id);
    
    // Pre-populate budget data
    setBudgetData({
      totalBudget: template.suggestedBudget,
      dailyBudget: Math.round(template.suggestedBudget / template.estimatedDays)
    });

    // If template has route data, populate the map
    if (template.route) {
      try {
        console.log('🗺️ Loading template route:', template.route);

        // Extract route data from template
        const { origin, destination, waypoints } = template.route;

        // Set route data for FreshTripPlanner to use
        setRouteData({
          origin,
          destination, 
          waypoints: waypoints || []
        });

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
            
          </div>

          <TabsContent value="trip-templates" className="mt-0">
            <TripTemplates onUseTemplate={handleUseTemplate} />
          </TabsContent>

          <TabsContent value="plan-trip" className="mt-0">
            <div className="h-[600px] relative rounded-lg overflow-hidden">
              <FreshTripPlanner 
                initialTemplate={selectedTemplate}
                onSaveTrip={(tripData) => {
                  console.log('Trip saved:', tripData);
                  toast({
                    title: "Trip Saved",
                    description: "Your trip has been saved successfully!"
                  });
                }}
              />
            </div>
          </TabsContent>
        </Tabs>


        {/* Social and export features are now integrated into FreshTripPlanner */}
      </div>
    </div>
  );
}