import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRegion } from '@/context/RegionContext';
import { useToast } from '@/hooks/use-toast';
import { tripTemplateServiceSafe } from '@/services/tripTemplateServiceSafe';
import { TripTemplate, incrementTemplateUsage } from '@/services/tripTemplateService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  ChevronRight,
  Search,
  Filter,
  Route,
  Calendar,
  X,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import the advanced components
import TripTemplateCard from './trip-templates/TripTemplateCard';
import TripSearch from './trip-templates/TripSearch';
import TripFilters from './trip-templates/TripFilters';

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
  const [selectedTrips, setSelectedTrips] = useState<TripTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showJourneyPanel, setShowJourneyPanel] = useState(false);
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
        const result = await tripTemplateServiceSafe.getLocationBasedTripTemplates(region);
        const templates = result.templates || [];
        
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

  // Auto-show journey panel when trips are selected
  useEffect(() => {
    if (selectedTrips.length > 0 && !showJourneyPanel) {
      setShowJourneyPanel(true);
    }
  }, [selectedTrips.length]);

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
  };

  const handleRemoveFromJourney = (templateId: string) => {
    setSelectedTrips(selectedTrips.filter(t => t.id !== templateId));
    if (selectedTrips.length === 1) {
      setShowJourneyPanel(false);
    }
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
        description: `${template.name} has been selected. Switch to the Trip Map Planner tab to customize it.`,
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
      {/* Search and Filters */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <TripSearch 
            value={searchQuery}
            onChange={setSearchQuery}
            onPAMSearch={() => {
              // Open PAM from the global button instead
              const pamButton = document.querySelector('[aria-label="Open PAM Assistant"]') as HTMLButtonElement;
              if (pamButton) pamButton.click();
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

      {/* Main Content Area */}
      {!loading && !error && (
        <>
          {/* Selected Journey Summary (when trips are selected) */}
          {selectedTrips.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                    <Route className="w-5 h-5" />
                    Journey Builder ({selectedTrips.length}/3 trips)
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowJourneyPanel(!showJourneyPanel)}
                    className="text-blue-700"
                  >
                    {showJourneyPanel ? 'Hide' : 'Show'} Details
                  </Button>
                </div>

                {showJourneyPanel && (
                  <>
                    <div className="space-y-2 mb-4">
                      {selectedTrips.map((trip, index) => (
                        <div key={trip.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                            <div>
                              <p className="font-medium">{trip.name}</p>
                              <p className="text-sm text-gray-600">{trip.estimatedDays} days • {trip.estimatedMiles} miles</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveFromJourney(trip.id)}
                            className="text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <Separator className="my-3" />

                    <div className="grid grid-cols-3 gap-4 text-center mb-4">
                      <div>
                        <p className="text-2xl font-bold text-blue-700">
                          {selectedTrips.reduce((sum, trip) => sum + trip.estimatedDays, 0)}
                        </p>
                        <p className="text-sm text-gray-600">Total Days</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-700">
                          {selectedTrips.reduce((sum, trip) => sum + trip.estimatedMiles, 0).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">Total Miles</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-700">
                          ${selectedTrips.reduce((sum, trip) => sum + trip.suggestedBudget, 0).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">Est. Budget</p>
                      </div>
                    </div>

                    <Button 
                      onClick={handleUseJourney} 
                      className="w-full"
                      size="lg"
                    >
                      Use This Journey
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </Button>
                  </>
                )}
              </div>
            </Card>
          )}

          {/* Trip Templates Grid */}
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
    </div>
  );
}