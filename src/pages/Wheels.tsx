
import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PamAssistant from "@/components/PamAssistant";
import TripPlanner from "@/components/wheels/TripPlanner";
import FuelLog from "@/components/wheels/FuelLog";
import VehicleMaintenance from "@/components/wheels/VehicleMaintenance";
import RVStorageOrganizer from "@/components/wheels/RVStorageOrganizer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRegion } from "@/context/RegionContext";

export default function Wheels() {
  const [activeTab, setActiveTab] = useState("trip-planner");
  const isMobile = useIsMobile();
  const { region } = useRegion();
  
  // Mock user data for Pam assistant
  const user = {
    name: "John",
    avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png"
  };
  
  // Define which features are available in which regions
  const getRegionalFeatures = () => {
    const coreFeatures = {
      "trip-planner": {
        title: "Trip Planner",
        available: true,
        component: <TripPlanner />
      },
      "vehicle-maintenance": {
        title: "Vehicle Maintenance",
        available: true,
        component: <VehicleMaintenance />
      },
      "rv-storage": {
        title: "RV Storage Organizer",
        available: true,
        component: <RVStorageOrganizer />
      }
    };
    
    // Fuel log has regional restrictions
    const fuelLogFeature = {
      "fuel-log": {
        title: "Fuel Log",
        available: ["Australia", "United States", "Canada", "New Zealand"].includes(region),
        component: <FuelLog />,
        comingSoon: !["Australia", "United States", "Canada", "New Zealand"].includes(region)
      }
    };
    
    return { ...coreFeatures, ...fuelLogFeature };
  };
  
  const regionalFeatures = getRegionalFeatures();
  
  // Set the first available tab as active if current one isn't available
  useEffect(() => {
    if (regionalFeatures[activeTab] && !regionalFeatures[activeTab].available) {
      const firstAvailableTab = Object.keys(regionalFeatures).find(
        key => regionalFeatures[key as keyof typeof regionalFeatures].available
      );
      
      if (firstAvailableTab) {
        setActiveTab(firstAvailableTab);
      }
    }
  }, [region]);
  
  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Wheels</h1>
        <p className="text-gray-600">
          Travel tools and resources for {region}
        </p>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content - 75% on desktop */}
        <div className="w-full lg:w-3/4">
          <Tabs 
            defaultValue="trip-planner"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="w-full justify-start overflow-x-auto mb-6">
              {Object.entries(regionalFeatures).map(([key, feature]) => (
                <TabsTrigger 
                  key={key}
                  value={key} 
                  className="text-base py-3 px-6 relative"
                  disabled={!feature.available}
                >
                  {feature.title}
                  {feature.comingSoon && (
                    <Badge className="ml-2 bg-amber-500 absolute -top-2 -right-2 text-[10px]">
                      Coming Soon
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <div className="bg-white rounded-lg border p-4 min-h-[600px]">
              {Object.entries(regionalFeatures).map(([key, feature]) => (
                <TabsContent key={key} value={key}>
                  {feature.comingSoon ? (
                    <div className="text-center py-12">
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">Coming Soon to {region}</h3>
                      <p className="text-gray-500">
                        We're working on bringing this feature to your region. 
                        Check back soon!
                      </p>
                    </div>
                  ) : (
                    feature.component
                  )}
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </div>
        
        {/* Pam Assistant - 25% on desktop, floating button on mobile */}
        <div className={`${isMobile ? 'fixed bottom-4 right-4 z-30' : 'w-full lg:w-1/4'}`}>
          {isMobile ? (
            <button 
              onClick={() => document.getElementById('pam-modal')?.classList.toggle('hidden')}
              className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg"
            >
              <span className="text-lg font-bold">Pam</span>
            </button>
          ) : (
            <PamAssistant user={user} />
          )}
          
          {/* Mobile Pam modal */}
          {isMobile && (
            <div id="pam-modal" className="hidden fixed inset-0 z-40 bg-black bg-opacity-50">
              <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-4 max-h-[80vh] overflow-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">Chat with Pam</h3>
                  <button 
                    onClick={() => document.getElementById('pam-modal')?.classList.add('hidden')}
                    className="text-gray-500"
                  >
                    Close
                  </button>
                </div>
                <PamAssistant user={user} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
