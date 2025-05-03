
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TabList from './tab-navigation/TabList';
import { TabData } from './tab-navigation/TabList';

interface TabNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: {
    name: string;
    avatar: string;
  };
}

// Default tabs that can be used across the application
export const defaultTabs: TabData[] = [
  { id: "you", label: "You", path: "/you" },
  { id: "wheels", label: "Wheels", path: "/wheels" },
  { id: "wins", label: "Wins", path: "/wins" },
  { id: "social", label: "Social", path: "/social" },
  { id: "shop", label: "Shop", path: "/shop" },
];

const TabNavigation = ({ activeTab, setActiveTab, user }: TabNavigationProps) => {
  const navigate = useNavigate();
  
  const handleTabClick = (tabId: string, path: string) => {
    setActiveTab(tabId);
    navigate(path);
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Tabs */}
          <TabList 
            tabs={defaultTabs}
            activeTab={activeTab}
            onTabChange={handleTabClick}
          />
          
          {/* Empty div for spacing - no user profile here */}
          <div></div>
        </div>
      </div>
    </div>
  );
};

export default TabNavigation;
