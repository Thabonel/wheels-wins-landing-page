
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import TripPlannerApp from "@/components/wheels/TripPlannerApp";
import FuelLog from "@/components/wheels/FuelLog";
import VehicleMaintenance from "@/components/wheels/VehicleMaintenance";
import RVStorageOrganizer from "@/components/wheels/RVStorageOrganizer";
import CaravanSafety from "@/components/wheels/CaravanSafety";

const Wheels = () => {
  const [activeTab, setActiveTab] = useState("trip-planner");
  const isMobile = useIsMobile();
  
  const tabs = [
    {
      id: "trip-planner",
      label: "Trip Planner"
    },
    {
      id: "fuel-log",
      label: "Fuel Log"
    },
    {
      id: "vehicle-maintenance",
      label: "Vehicle Maintenance"
    },
    {
      id: "rv-storage",
      label: "RV Storage"
    },
    {
      id: "caravan-safety",
      label: "Caravan Safety"
    }
  ];

  return (
    <div className="container p-6">
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        {/* Main Content - 75% on desktop */}
        <div className="w-full lg:w-3/4 h-full bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start flex-wrap mb-6">
                {isMobile ? (
                  <div className="w-full p-2">
                    <select 
                      value={activeTab} 
                      onChange={e => setActiveTab(e.target.value)} 
                      className="w-full bg-white border border-gray-200 rounded-md py-2 px-3 text-sm"
                    >
                      {tabs.map(tab => (
                        <option key={tab.id} value={tab.id}>
                          {tab.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  tabs.map(tab => (
                    <TabsTrigger key={tab.id} value={tab.id} className="text-base py-3 px-6">
                      {tab.label}
                    </TabsTrigger>
                  ))
                )}
              </TabsList>
              
              <div className="min-h-[600px]">
                <TabsContent value="trip-planner" className="mt-0">
                  <TripPlannerApp />
                </TabsContent>
                
                <TabsContent value="fuel-log" className="mt-0">
                  <FuelLog />
                </TabsContent>
                
                <TabsContent value="vehicle-maintenance" className="mt-0">
                  <VehicleMaintenance />
                </TabsContent>
                
                <TabsContent value="rv-storage" className="mt-0">
                  <RVStorageOrganizer />
                </TabsContent>
                
                <TabsContent value="caravan-safety" className="mt-0">
                  <CaravanSafety />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wheels;
