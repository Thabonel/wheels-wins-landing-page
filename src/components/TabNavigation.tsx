
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface TabNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: {
    name: string;
    avatar: string;
  };
}

const TabNavigation = ({ activeTab, setActiveTab, user }: TabNavigationProps) => {
  const navigate = useNavigate();
  
  const tabs = [
    { id: "you", label: "You", path: "/you" },
    { id: "wheels", label: "Wheels", path: "/wheels" },
    { id: "wins", label: "Wins", path: "/wins" },
    { id: "social", label: "Social", path: "/social" },
    { id: "shop", label: "Shop", path: "/shop" },
  ];

  const handleTabClick = (tabId: string, path: string) => {
    setActiveTab(tabId);
    navigate(path);
  };

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
                onClick={() => handleTabClick(tab.id, tab.path)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Empty div for spacing - no user profile here */}
          <div></div>
        </div>
      </div>
    </div>
  );
};

export default TabNavigation;
