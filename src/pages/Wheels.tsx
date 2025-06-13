
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import TripPlanner from "@/components/wheels/TripPlanner";
import FuelLog from "@/components/wheels/FuelLog";
import VehicleMaintenance from "@/components/wheels/VehicleMaintenance";
import RVStorageOrganizer from "@/components/wheels/RVStorageOrganizer";

const Wheels = () => {
  const [activeTab, setActiveTab] = useState("trip-planner");
  const isMobile = useIsMobile();
  
  const tabs = [
    { id: "trip-planner", label: "Trip Planner" },
    { id: "fuel-log", label: "Fuel Log" },
    { id: "vehicle-maintenance", label: "Vehicle Maintenance" },
    { id: "rv-storage", label: "RV Storage" },
    { id: "caravan-safety", label: "Caravan Safety" },
  ];

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 h-full">
        <div className="flex flex-col lg:flex-row gap-6 h-full">
          {/* Main Content - 75% on desktop */}
          <div className="w-full lg:w-3/4 h-full bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-6">Wheels</h1>
              
              <Tabs 
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="w-full justify-start flex-wrap mb-6">
                  {isMobile ? (
                    <div className="w-full p-2">
                      <select 
                        value={activeTab}
                        onChange={(e) => setActiveTab(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-md py-2 px-3 text-sm"
                      >
                        {tabs.map((tab) => (
                          <option key={tab.id} value={tab.id}>
                            {tab.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    tabs.map((tab) => (
                      <TabsTrigger 
                        key={tab.id} 
                        value={tab.id} 
                        className="text-base py-3 px-6"
                      >
                        {tab.label}
                      </TabsTrigger>
                    ))
                  )}
                </TabsList>
                
                <div className="min-h-[600px]">
                  <TabsContent value="trip-planner" className="mt-0">
                    <TripPlanner />
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
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold">Caravan Safety</h2>
                      <p className="text-gray-600">
                        Safety checklists, tips, and emergency procedures for caravan travel.
                      </p>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-gray-500">Caravan Safety component will be implemented here</p>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wheels;
