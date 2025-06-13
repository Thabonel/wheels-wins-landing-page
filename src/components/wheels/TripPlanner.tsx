
import React from 'react';

const TripPlanner: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Trip Planner</h1>
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-3">Plan Your Next Adventure</h2>
            <p className="text-blue-800 mb-4">Plan your trips and routes with our interactive trip planner.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <h3 className="font-medium text-gray-900 mb-2">Route Planning</h3>
                <p className="text-gray-600 text-sm">Plan optimal routes for your caravan journey</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <h3 className="font-medium text-gray-900 mb-2">Trip Management</h3>
                <p className="text-gray-600 text-sm">Organize and manage your upcoming trips</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Getting Started</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                Set your departure and destination points
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                Add waypoints and stops along your route
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                Save and share your planned trips
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripPlanner;
