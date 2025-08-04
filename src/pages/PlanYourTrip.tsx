import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRegion } from '@/context/RegionContext';
import { useToast } from '@/hooks/use-toast';
import { getLocationBasedTripTemplates, TripTemplate } from '@/services/tripTemplateService';
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
  Route
} from 'lucide-react';
import TripTemplateCard from '@/components/wheels/trip-templates/TripTemplateCard';
import JourneyBuilder from '@/components/wheels/trip-templates/JourneyBuilder';
import TripSearch from '@/components/wheels/trip-templates/TripSearch';
import TripFilters from '@/components/wheels/trip-templates/TripFilters';
import PAMTripAssistant from '@/components/wheels/trip-templates/PAMTripAssistant';

export default function PlanYourTrip() {
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
          setError('No trip templates available for your region yet.');
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container px-6 py-8">
          <div className="max-w-4xl">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Plan Your Trip</h1>
            <p className="text-lg text-gray-600">
              Browse curated RV routes, get PAM's insights, and build your perfect journey
            </p>
          </div>
        </div>
      </div>

      <div className="container px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="browse" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Browse Templates
            </TabsTrigger>
            <TabsTrigger value="journey" className="flex items-center gap-2 relative">
              <Route className="w-4 h-4" />
              Your Journey
              {selectedTrips.length > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {selectedTrips.length}
                </Badge>
              )}
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
                    // PAM search will be handled by PAMTripAssistant
                    console.log('PAM Search:', query);
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
              <Card className="p-8 text-center">
                <div className="text-yellow-600 mb-4">
                  <MapPin className="w-12 h-12 mx-auto" />
                </div>
                <p className="text-gray-700 mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </Card>
            )}

            {/* Trip Templates Grid */}
            {!loading && !error && filteredTemplates.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600">
                    Showing {filteredTemplates.length} of {tripTemplates.length} trips
                  </p>
                  <PAMTripAssistant 
                    templates={filteredTemplates}
                    onSelectTemplate={handleAddToJourney}
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredTemplates.map((template) => (
                    <TripTemplateCard
                      key={template.id}
                      template={template}
                      onAddToJourney={handleAddToJourney}
                      isInJourney={selectedTrips.some(t => t.id === template.id)}
                    />
                  ))}
                </div>
              </>
            )}

            {/* No Results */}
            {!loading && !error && filteredTemplates.length === 0 && (
              <Card className="p-8 text-center">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No trips found</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your filters or search terms
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
              </Card>
            )}
          </TabsContent>

          <TabsContent value="journey" className="space-y-6">
            <JourneyBuilder
              selectedTrips={selectedTrips}
              onRemoveTrip={handleRemoveFromJourney}
              onReorderTrips={setSelectedTrips}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}