
import React from 'react';

const TripPlanner: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <h1 className="text-2xl font-bold mb-6">Trip Planner</h1>
        <div className="space-y-6">
          <p className="text-gray-600">Plan your trips and routes with our interactive trip planner.</p>
          {/* Trip planner content will go here */}
        </div>
      </div>
    </div>
  );
};

export default TripPlanner;
