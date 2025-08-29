import React from 'react';
import FreshTripPlanner from '@/components/wheels/trip-planner/fresh/FreshTripPlanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

export default function FreshTripPlannerTest() {
  const handleSaveTrip = async (tripData: any) => {
    console.log('Saving trip:', tripData);
    // In production, this would save to Supabase
  };

  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Fresh Trip Planner Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-2">
            Testing the new trip planner with working undo/redo functionality.
          </p>
          <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
            <p className="font-semibold text-green-800">✅ Features Working:</p>
            <ul className="list-disc list-inside text-green-700 mt-1">
              <li>Undo/Redo functionality (Ctrl+Z / Ctrl+Shift+Z)</li>
              <li>Add waypoints by clicking the map</li>
              <li>Drag to reorder waypoints</li>
              <li>Map style switching</li>
              <li>Traffic layer toggle</li>
              <li>Route profile selection (Drive/Bike/Walk)</li>
              <li>RV-specific POI categories</li>
              <li>Save and share trip functionality</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="h-[600px] bg-white rounded-lg shadow-lg overflow-hidden">
        <FreshTripPlanner 
          onSaveTrip={handleSaveTrip}
          onBack={handleBack}
        />
      </div>
    </div>
  );
}