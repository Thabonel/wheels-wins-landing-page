import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRegion } from '@/context/RegionContext';
import { useToast } from '@/hooks/use-toast';
import { getLocationBasedTripTemplates, TripTemplate, incrementTemplateUsage } from '@/services/tripTemplateService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  ChevronRight,
  Search,
  Filter,
  Sparkles,
  Route,
  Star,
  Navigation,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import the advanced components
import TripTemplateCard from './trip-templates/TripTemplateCard';
import JourneyBuilder from './trip-templates/JourneyBuilder';
import TripSearch from './trip-templates/TripSearch';
import TripFilters from './trip-templates/TripFilters';
import PAMTripAssistant from './trip-templates/PAMTripAssistant';

interface TripTemplatesProps {
  onUseTemplate?: (template: TripTemplate) => void;
}

export default function TripTemplates({ onUseTemplate }: TripTemplatesProps) {
  const { user } = useAuth();
  const { region } = useRegion();
  const { toast } = useToast();
  
  const [tripTemplates, setTripTemplates] = useState<TripTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<TripTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('browse');
  const [selectedTrips, setSelectedTrips] = useState<TripTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    duration: 'all',
    difficulty: 'all',
    category: 'all'
  });

  // Load trip templates based on region
  useEffect(() => {
    async function loadTemplates() {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`Loading trip templates for region: ${region}`);
        const templates = await getLocationBasedTripTemplates(region);
        
        setTripTemplates(templates);
        setFilteredTemplates(templates);
        
        if (templates.length === 0) {
          setError('No trip templates available for your region yet. Our scraper is working to find some!');
        }
      } catch (err) {
        console.error('Error loading trip templates:', err);
        setError('Failed to load trip templates. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    }

    loadTemplates();
  }, [region]);

  // Apply filters and search
  useEffect(() => {
    let filtered = [...tripTemplates];

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.highlights.some(h => h.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply duration filter
    if (activeFilters.duration !== 'all') {
      const [min, max] = activeFilters.duration.split('-').map(Number);
      filtered = filtered.filter(template => 
        template.estimatedDays >= min && template.estimatedDays <= max
      );
    }

    // Apply difficulty filter
    if (activeFilters.difficulty !== 'all') {
      filtered = filtered.filter(template => 
        template.difficulty === activeFilters.difficulty
      );
    }

    // Apply category filter
    if (activeFilters.category !== 'all') {
      filtered = filtered.filter(template => 
        template.category === activeFilters.category
      );
    }

    setFilteredTemplates(filtered);
  }, [searchQuery, activeFilters, tripTemplates]);

  const handleAddToJourney = (template: TripTemplate) => {
    if (selectedTrips.find(t => t.id === template.id)) {
      toast({
        title: "Already Added",
        description: "This trip is already in your journey",
        variant: "default"
      });
      return;
    }

    if (selectedTrips.length >= 3) {
      toast({
        title: "Journey Full",
        description: "You can chain up to 3 trips for a 3-month adventure",
        variant: "destructive"
      });
      return;
    }

    setSelectedTrips([...selectedTrips, template]);
    toast({
      title: "Added to Journey",
      description: `${template.name} has been added to your journey`,
    });

    // Switch to journey tab if this is the first trip
    if (selectedTrips.length === 0) {
      setActiveTab('journey');
    }
  };

  const handleRemoveFromJourney = (templateId: string) => {
    setSelectedTrips(selectedTrips.filter(t => t.id !== templateId));
  };

  const handleUseTemplate = async (template: TripTemplate) => {
    // Increment usage count
    await incrementTemplateUsage(template.id);
    
    // Call parent handler if provided
    if (onUseTemplate) {
      onUseTemplate(template);
    } else {
      toast({
        title: "Template Selected",
        description: `${template.name} has been selected. Switch to the Plan Trip tab to customize it.`,
      });
    }
  };

  const handleUseJourney = () => {
    if (selectedTrips.length === 0) {
      toast({
        title: "No Trips Selected",
        description: "Add some trips to your journey first",
        variant: "destructive"
      });
      return;
    }

    // For now, use the first trip as the base template
    // In a full implementation, this would merge all trips
    const baseTemplate = selectedTrips[0];
    const totalDays = selectedTrips.reduce((sum, trip) => sum + trip.estimatedDays, 0);
    const totalMiles = selectedTrips.reduce((sum, trip) => sum + trip.estimatedMiles, 0);
    const totalBudget = selectedTrips.reduce((sum, trip) => sum + trip.suggestedBudget, 0);

    const journeyTemplate: TripTemplate = {
      ...baseTemplate,
      name: `${selectedTrips.length}-Trip Journey`,
      description: `Combined journey: ${selectedTrips.map(t => t.name).join(' → ')}`,
      estimatedDays: totalDays,
      estimatedMiles: totalMiles,
      suggestedBudget: totalBudget,
      highlights: selectedTrips.flatMap(t => t.highlights).slice(0, 6)
    };

    handleUseTemplate(journeyTemplate);
    
    toast({
      title: "Journey Created",
      description: `Your ${selectedTrips.length}-trip journey has been loaded into the trip planner`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Plan Your Trip</h2>
          <p className="text-muted-foreground">
            Browse curated RV routes, get PAM's insights, and build your perfect journey
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="browse" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Browse
          </TabsTrigger>
          <TabsTrigger value="journey" className="flex items-center gap-2 relative">
            <Route className="w-4 h-4" />
            Journey
            {selectedTrips.length > 0 && (
              <Badge 
                variant="destructive" 
                className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {selectedTrips.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="assistant" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            PAM
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          {/* Search and Filters */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <TripSearch 
                value={searchQuery}
                onChange={setSearchQuery}
                onPAMSearch={(query) => {
                  // Switch to PAM tab with the query
                  setActiveTab('assistant');
                }}
              />
            </div>
            <div>
              <TripFilters
                filters={activeFilters}
                onChange={setActiveFilters}
                templates={tripTemplates}
              />
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading amazing trips for {region}...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="text-center py-8">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">{error}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="mt-2 text-yellow-600 underline hover:text-yellow-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Trip Templates Grid */}
          {!loading && !error && (
            <>
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">
                    No trips match your current filters
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setActiveFilters({
                        duration: 'all',
                        difficulty: 'all',
                        category: 'all'
                      });
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>📍 {region} Templates:</strong> Showing {filteredTemplates.length} of {tripTemplates.length} trip templates.
                      {tripTemplates.some(t => t.createdBy === 'auto-scraper') && ' Some templates were automatically discovered and curated for you!'}
                    </p>
                  </div>
                  
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTemplates.map((template) => (
                      <TripTemplateCard
                        key={template.id}
                        template={template}
                        onAddToJourney={handleAddToJourney}
                        onUseTemplate={handleUseTemplate}
                        isInJourney={selectedTrips.some(t => t.id === template.id)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="journey" className="space-y-6">
          <JourneyBuilder
            selectedTrips={selectedTrips}
            onRemoveTrip={handleRemoveFromJourney}
            onReorderTrips={setSelectedTrips}
            onUseJourney={handleUseJourney}
          />
        </TabsContent>

        <TabsContent value="assistant" className="space-y-6">
          <PAMTripAssistant
            templates={tripTemplates}
            onSelectTemplate={handleUseTemplate}
            onAddToJourney={handleAddToJourney}
            initialQuery={searchQuery}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}