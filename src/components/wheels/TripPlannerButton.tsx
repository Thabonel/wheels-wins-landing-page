import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, Route, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const TripPlannerButton = () => {
  const navigate = useNavigate();

  const handleOpenFullScreen = () => {
    // Navigate to full-screen trips page
    navigate('/trips');
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleOpenFullScreen}
        className="bg-green-700 hover:bg-green-800 text-white"
        size="lg"
      >
        <Map className="mr-2 h-5 w-5" />
        Open Full-Screen Trip Planner
      </Button>
      
      <Button
        variant="outline"
        onClick={() => window.open('https://unimogcommunity-staging.netlify.app/trips', '_blank')}
        size="lg"
      >
        <Navigation className="mr-2 h-5 w-5" />
        View Unimog Example
      </Button>
    </div>
  );
};

export default TripPlannerButton;