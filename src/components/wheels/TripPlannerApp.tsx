import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
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
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Import existing components
import TripPlannerLayout from './trip-planner/TripPlannerLayout';
import IntegratedTripPlanner from './trip-planner/IntegratedTripPlanner';
import PAMTripChat from './trip-planner/PAMTripChat';
import SocialTripCoordinator from './trip-planner/SocialTripCoordinator';
import PAMTripSuggestions from './trip-planner/PAMTripSuggestions';
import BudgetSidebar from './trip-planner/BudgetSidebar';
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
  const [currentView, setCurrentView] = useState<'dashboard' | 'planner' | 'templates' | 'details' | 'budget' | 'social'>('planner');
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

  const handleStartPlanning = () => {
    setCurrentView('planner');
    setIsPlannerInitialized(true);
  };

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
    
    setCurrentView('planner');
    setIsPlannerInitialized(true);
  };

  const TripDashboard = () => (
    <div className="space-y-6">
      {/* Map Container - Moved to top */}
      <div className="relative">
        <div className="h-[400px] w-full rounded-lg border shadow-sm bg-muted/30 flex items-center justify-center">
          <div className="text-center space-y-2">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Click "Plan Trip" to start route planning</p>
          </div>
        </div>
      </div>

      {/* Trip Progress Overview */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Trip Planning Progress
            </CardTitle>
            <Badge variant="secondary">
              {integratedState.route.originName && integratedState.route.destName ? 'Route Set' : 'Getting Started'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
          
          {/* Quick Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Trip Planning Progress</span>
              <span>{Math.round(calculateCompletionPercentage())}%</span>
            </div>
            <Progress value={calculateCompletionPercentage()} className="h-2" />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleStartPlanning} className="flex-1">
              <Route className="w-4 h-4 mr-2" />
              {integratedState.route.originName ? 'Continue Planning' : 'Start Planning'}
            </Button>
            <Button variant="outline" onClick={() => setCurrentView('templates')}>
              <Sparkles className="w-4 h-4 mr-2" />
              Templates
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Trip Summary */}
      {(integratedState.route.originName || integratedState.route.destName) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="w-5 h-5" />
              Current Trip
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
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
              
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={handleStartPlanning}>
                  <Settings className="w-4 h-4 mr-1" />
                  Modify
                </Button>
                <Button size="sm" variant="outline" onClick={() => integratedState.toggleFeature('social')}>
                  <Users className="w-4 h-4 mr-1" />
                  Share
                </Button>
                <Button size="sm" variant="outline" onClick={() => integratedState.toggleFeature('export')}>
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PAM Suggestions Preview */}
      {integratedState.pam.suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              PAM Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PAMTripSuggestions maxSuggestions={2} />
            <div className="pt-3">
              <Button variant="outline" size="sm" onClick={() => integratedState.toggleFeature('pam')}>
                <MessageSquare className="w-4 h-4 mr-1" />
                Chat with PAM
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Trip planner opened</span>
            </div>
            {integratedState.route.originName && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span>Origin set to {integratedState.route.originName}</span>
              </div>
            )}
            {integratedState.budget.totalBudget > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-2 h-2 bg-warning rounded-full"></div>
                <span>Budget set to ${integratedState.budget.totalBudget}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const TemplateGallery = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Trip Templates</h2>
          <p className="text-muted-foreground">Start with proven RV routes and customize to your needs</p>
        </div>
        <Button variant="outline" onClick={() => setCurrentView('dashboard')}>
          Back to Dashboard
        </Button>
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

  const calculateCompletionPercentage = () => {
    let completed = 0;
    let total = 5;
    
    if (integratedState.route.originName) completed++;
    if (integratedState.route.destName) completed++;
    if (integratedState.budget.totalBudget > 0) completed++;
    if (integratedState.route.waypoints.length > 0) completed++;
    if (integratedState.pam.context.chatHistory.length > 0) completed++;
    
    return (completed / total) * 100;
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
              <Button size="lg" className="text-lg px-8 py-3" onClick={handleStartPlanning}>
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
      {/* Header with animated controls - Always visible */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex gap-2 justify-center">
            {/* Navigation Buttons */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                onClick={() => setCurrentView('templates')}
                variant={currentView === 'templates' ? 'default' : 'outline'}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Trip Templates
              </Button>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                onClick={() => setCurrentView('planner')}
                variant={currentView === 'planner' ? 'default' : 'outline'}
              >
                <Route className="w-4 h-4 mr-2" />
                Plan Trip
              </Button>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                onClick={() => setCurrentView('details')}
                variant={currentView === 'details' ? 'default' : 'outline'}
              >
                <Settings className="w-4 h-4 mr-2" />
                Trip Details
              </Button>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                onClick={() => setCurrentView('budget')}
                variant={currentView === 'budget' ? 'default' : 'outline'}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Budget
              </Button>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                onClick={() => setCurrentView('social')}
                variant={currentView === 'social' ? 'default' : 'outline'}
              >
                <Users className="w-4 h-4 mr-2" />
                Social
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {currentView === 'templates' && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <TemplateGallery />
            </motion.div>
          )}

          {currentView === 'planner' && (
            <motion.div
              key="planner"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <IntegratedTripPlanner />
            </motion.div>
          )}

          {currentView === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <TripDashboard />
            </motion.div>
          )}

          {currentView === 'budget' && (
            <motion.div
              key="budget"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex h-[600px]">
                <BudgetSidebar isVisible={true} onClose={() => {}} />
              </div>
            </motion.div>
          )}

          {currentView === 'social' && (
            <motion.div
              key="social"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SocialTripCoordinator 
                isOpen={true} 
                onClose={() => {}}
                currentRoute={integratedState.route}
                currentBudget={integratedState.budget}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}