
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";

interface TabNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: {
    name: string;
    avatar: string;
  };
}

const TabNavigation = ({ activeTab, setActiveTab, user }: TabNavigationProps) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
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

          {/* User Profile */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <span className="text-base font-medium">{user.name}</span>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <div className="space-y-2">
                <h4 className="font-medium">Profile Settings</h4>
                <div className="border-t pt-2">
                  <Button variant="ghost" className="w-full justify-start">
                    Account Settings
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    Preferences
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    Log Out
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default TabNavigation;
