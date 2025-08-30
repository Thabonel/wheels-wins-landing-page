import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { 
  Save, 
  History, 
  MapPin, 
  Share2,
  Calendar,
  Route
} from 'lucide-react';
import SavedTrips from './sections/SavedTrips';
import TripHistory from './sections/TripHistory';
import TripTemplates from './sections/TripTemplates';
import SharedTrips from './sections/SharedTrips';

export default function TripsHub() {
  const [activeTab, setActiveTab] = useState('saved');

  return (
    <div className="container p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <p className="text-gray-600">Manage your saved trips, browse templates, and explore shared journeys</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Saved Trips</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
            <TabsTrigger value="shared" className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Shared</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="saved" className="mt-0">
            <SavedTrips />
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <TripHistory />
          </TabsContent>

          <TabsContent value="templates" className="mt-0">
            <TripTemplates />
          </TabsContent>

          <TabsContent value="shared" className="mt-0">
            <SharedTrips />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}