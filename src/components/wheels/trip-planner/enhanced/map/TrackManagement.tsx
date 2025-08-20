import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Search, 
  MapPin, 
  Upload, 
  Save,
  ChevronDown,
  ChevronUp,
  Navigation,
  Clock,
  Mountain,
  Download,
  Trash2
} from 'lucide-react';
import { GPXUploadModal } from '../GPXUploadModal';
import { GPXTrack } from './utils/tracks/parsers';
import { exportRouteAsGPX } from './utils/tracks/exporters';
import { useToast } from '@/hooks/use-toast';

interface Track {
  id: string;
  name: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  distance: number;
  length: number;
  type?: string;
}

interface TrackManagementProps {
  onTrackSelect?: (track: Track) => void;
  onUpload?: () => void;
  currentRoute?: any; // Current route data for export
  waypoints?: Array<{ name: string; coords: [number, number] }>;
  tripName?: string;
}

const TrackManagement: React.FC<TrackManagementProps> = ({ 
  onTrackSelect,
  onUpload,
  currentRoute,
  waypoints = [],
  tripName = 'My RV Trip'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [nearbyOpen, setNearbyOpen] = useState(true);
  const [uploadedOpen, setUploadedOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [showGPXUpload, setShowGPXUpload] = useState(false);
  const [uploadedTracks, setUploadedTracks] = useState<GPXTrack[]>([]);
  const { toast } = useToast();

  // Mock data - would come from API
  const nearbyTracks: Track[] = [
    { id: '1', name: 'test', difficulty: 'beginner', distance: 10.8, length: 39.77 },
    { id: '2', name: 'test', difficulty: 'beginner', distance: 14.3, length: 29.18 },
    { id: '3', name: 'test', difficulty: 'beginner', distance: 24.7, length: 44.88 },
    { id: '4', name: 'test', difficulty: 'beginner', distance: 38.6, length: 41.90 },
    { id: '5', name: '63-87 to 421 Route', difficulty: 'beginner', distance: 42.4, length: 26.63 },
  ];

  const savedTrips: Track[] = [
    { id: '6', name: 'test', difficulty: 'beginner', distance: 14.3, length: 29.18 },
    { id: '7', name: 'test', difficulty: 'beginner', distance: 38.6, length: 41.90 },
    { id: '8', name: 'test', difficulty: 'beginner', distance: 10.8, length: 39.77 },
    { id: '9', name: 'Jenolan caves run', difficulty: 'beginner', distance: 101.4, length: 27.17 },
    { id: '10', name: 'test', difficulty: 'beginner', distance: 24.7, length: 44.88 },
    { id: '11', name: '63-87 to 421 Route', difficulty: 'beginner', distance: 42.4, length: 26.63 },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch(difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'intermediate': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'advanced': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'expert': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const handleGPXTrackLoaded = (track: GPXTrack) => {
    setUploadedTracks(prev => [...prev, track]);
    setUploadedOpen(true);
    
    // Convert GPX track to Track format and select it
    const convertedTrack: Track = {
      id: `gpx-${Date.now()}`,
      name: track.name,
      difficulty: 'beginner', // Default difficulty
      distance: track.totalDistance || 0,
      length: track.totalDistance || 0,
      type: 'gpx'
    };
    
    onTrackSelect?.(convertedTrack);
    
    toast({
      title: "Track Loaded",
      description: `"${track.name}" has been added to your tracks.`,
    });
  };

  const handleExportGPX = () => {
    if (!currentRoute) {
      toast({
        title: "No Route to Export",
        description: "Please plan a route first before exporting.",
        variant: "destructive"
      });
      return;
    }
    
    exportRouteAsGPX(currentRoute, waypoints, tripName);
    
    toast({
      title: "Route Exported",
      description: `Your route has been exported as "${tripName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_route.gpx"`,
    });
  };

  const handleDeleteTrack = (trackId: string) => {
    setUploadedTracks(prev => prev.filter(t => `gpx-${t.name}` !== trackId));
    toast({
      title: "Track Removed",
      description: "The track has been removed from your collection.",
    });
  };

  const TrackItem = ({ track }: { track: Track }) => (
    <div 
      className="flex items-start gap-2 p-2 hover:bg-accent rounded-md cursor-pointer transition-colors"
      onClick={() => onTrackSelect?.(track)}
    >
      <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold mt-1">
        {track.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{track.name}</span>
          <Badge variant="secondary" className={`text-xs ${getDifficultyColor(track.difficulty)}`}>
            {track.difficulty}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {track.distance} km
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Length: {track.length}km
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Card className="w-80 h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">TRACK MANAGEMENT</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search tracks by name or location"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setShowGPXUpload(true)}
            >
              <Upload className="h-4 w-4 mr-1" />
              Import GPX
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleExportGPX}
              disabled={!currentRoute}
            >
              <Download className="h-4 w-4 mr-1" />
              Export GPX
            </Button>
          </div>
        </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-16rem)]">
          {/* Nearby Tracks */}
          <Collapsible open={nearbyOpen} onOpenChange={setNearbyOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 hover:bg-accent transition-colors">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">Nearby Tracks</span>
                <Badge variant="secondary" className="ml-1">
                  {nearbyTracks.length}
                </Badge>
              </div>
              {nearbyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="px-2">
              {nearbyTracks.map(track => (
                <TrackItem key={track.id} track={track} />
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Uploaded Tracks */}
          <Collapsible open={uploadedOpen} onOpenChange={setUploadedOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 hover:bg-accent transition-colors border-t">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                <span className="font-medium">Uploaded Tracks</span>
                <Badge variant="secondary" className="ml-1">
                  {uploadedTracks.length}
                </Badge>
              </div>
              {uploadedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 py-3">
              {uploadedTracks.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center">
                  <p>No uploaded tracks. Upload GPX files to get started.</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => setShowGPXUpload(true)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Track
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {uploadedTracks.map((track, index) => (
                    <div 
                      key={`gpx-${index}`}
                      className="flex items-start gap-2 p-2 hover:bg-accent rounded-md cursor-pointer transition-colors"
                    >
                      <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold mt-1">
                        GPX
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{track.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {track.totalDistance?.toFixed(1) || 0} mi
                          </span>
                          <span className="flex items-center gap-1">
                            <Mountain className="h-3 w-3" />
                            {track.totalElevationGain?.toFixed(0) || 0}ft gain
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTrack(`gpx-${track.name}`)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Saved Trips */}
          <Collapsible open={savedOpen} onOpenChange={setSavedOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 hover:bg-accent transition-colors border-t">
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                <span className="font-medium">Saved Trips</span>
                <Badge variant="secondary" className="ml-1">
                  {savedTrips.length}
                </Badge>
              </div>
              {savedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="px-2">
              {savedTrips.map(track => (
                <TrackItem key={track.id} track={track} />
              ))}
            </CollapsibleContent>
          </Collapsible>

          <div className="px-4 py-3 text-xs text-muted-foreground text-center border-t">
            {nearbyTracks.length + savedTrips.length} of {nearbyTracks.length + savedTrips.length} tracks visible
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
    
    {/* GPX Upload Modal */}
    <GPXUploadModal
      isOpen={showGPXUpload}
      onClose={() => setShowGPXUpload(false)}
      onTrackLoaded={handleGPXTrackLoaded}
    />
    </>
  );
};

export default TrackManagement;