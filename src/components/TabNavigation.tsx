import { useState } from 'react';

interface TabNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: {
    name: string;
    avatar: string;
  };
}

const TabNavigation = ({ activeTab, setActiveTab, user }: TabNavigationProps) => {
  const tabs = [
    { id: "you", label: "You" },
    { id: "wheels", label: "Wheels" },
    { id: "wins", label: "Wins" },
    { id: "social", label: "Social" },
    { id: "shop", label: "Shop" },
  ];

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Tabs */}
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`text-lg font-semibold py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Removed user profile section - keeping the layout structure with empty div for spacing */}
          <div></div>
        </div>
      </div>
    </div>
  );
};

export default TabNavigation;
