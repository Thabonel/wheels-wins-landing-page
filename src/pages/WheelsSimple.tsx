import React from 'react';
import FreshTripPlanner from '@/components/wheels/trip-planner/fresh/FreshTripPlanner';

const WheelsSimple: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Trip Planner 2</h1>
        <div className="relative w-full" style={{ height: 'calc(100vh - 120px)' }}>
          <FreshTripPlanner />
        </div>
      </div>
    </div>
  );
};

export default WheelsSimple;