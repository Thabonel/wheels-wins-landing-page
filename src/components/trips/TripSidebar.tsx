import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Plus, MapPin, Navigation, Calendar, Route, ChevronRight, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { fetchTripTemplatesForRegion, TripTemplate } from '@/services/tripTemplateService';
import { useRegion } from '@/context/RegionContext';
import { toast } from 'sonner';

interface TripSidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  onCreateTrip?: () => void;
  onSelectTemplate?: (template: any) => void;
  onSearchLocation?: (query: string) => void;
}

export default function TripSidebar({
  isOpen,
  onClose,
  onCreateTrip,
  onSelectTemplate,
  onSearchLocation
}: TripSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('search');
  const [templates, setTemplates] = useState<TripTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const { region } = useRegion();

  // Load templates when region changes or tab becomes active
  useEffect(() => {
    if (activeTab === 'templates' && templates.length === 0) {
      loadTemplates();
    }
  }, [activeTab, region]);

  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const fetchedTemplates = await fetchTripTemplatesForRegion(region);
      setTemplates(fetchedTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load trip templates');
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // Mock data for saved trips - will be replaced with real data
  const savedTrips = [
    {
      id: '1',
      name: 'Yellowstone Adventure',
      date: '2024-07-15',
      distance: '2,450 miles',
      duration: '14 days',
      waypoints: 8
    },
    {
      id: '2', 
      name: 'Pacific Coast Highway',
      date: '2024-06-01',
      distance: '1,650 miles',
      duration: '10 days',
      waypoints: 12
    }
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchLocation && searchQuery.trim()) {
      onSearchLocation(searchQuery);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      "absolute top-0 left-0 h-full w-80 bg-background/95 backdrop-blur-sm",
      "shadow-xl border-r z-20 transition-transform duration-300",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Trip Planner</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="lg:hidden"
            aria-label="Close trip planner sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4"
          />
        </form>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-3 m-4">
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="trips">My Trips</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 px-4">
          {/* Search Tab */}
          <TabsContent value="search" className="mt-0">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Enter a location above to search for places, campgrounds, and points of interest.
              </div>
              
              {/* Quick Actions */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Quick Actions</h3>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => onSearchLocation?.('RV parks near me')}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Find RV Parks Nearby
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => onSearchLocation?.('National parks')}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Explore National Parks
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => onSearchLocation?.('Scenic routes')}
                >
                  <Route className="h-4 w-4 mr-2" />
                  Discover Scenic Routes
                </Button>
              </div>

              {/* Recent Searches */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Recent Searches</h3>
                <div className="space-y-1">
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors">
                    Yellowstone National Park
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors">
                    Grand Canyon South Rim
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors">
                    Zion National Park
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* My Trips Tab */}
          <TabsContent value="trips" className="mt-0">
            <div className="space-y-4">
              <Button 
                onClick={onCreateTrip}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Trip
              </Button>

              <div className="space-y-2">
                {savedTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{trip.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Calendar className="inline h-3 w-3 mr-1" />
                          {trip.date}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{trip.distance}</span>
                      <span>•</span>
                      <span>{trip.duration}</span>
                      <span>•</span>
                      <span>{trip.waypoints} stops</span>
                    </div>
                  </div>
                ))}
              </div>

              {savedTrips.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No saved trips yet</p>
                  <Button size="sm" onClick={onCreateTrip}>
                    <Plus className="h-4 w-4 mr-1" />
                    Create your first trip
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-0">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-4">
                Start with a pre-planned route and customize it to your needs
              </p>
              
              {isLoadingTemplates ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : templates.length > 0 ? (
                templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => onSelectTemplate?.(template)}
                    className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <h4 className="font-medium">{template.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {template.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {template.estimatedMiles} miles
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {template.estimatedDays} days
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          template.difficulty === 'beginner' && "text-green-600 border-green-600",
                          template.difficulty === 'intermediate' && "text-yellow-600 border-yellow-600",
                          template.difficulty === 'advanced' && "text-red-600 border-red-600"
                        )}
                      >
                        {template.difficulty}
                      </Badge>
                    </div>
                    {template.suggestedBudget && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Budget: ${template.suggestedBudget}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No templates available for {region}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={loadTemplates}
                  >
                    Retry
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}