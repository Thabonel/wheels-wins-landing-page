
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

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
    <div className="w-full h-full min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full">
        <div className="flex flex-col lg:flex-row gap-6 h-full">
          {/* Main Content - 75% on desktop */}
          <div className="w-full lg:w-3/4 h-full bg-white rounded-lg shadow-sm border p-6">
            <h1 className="text-2xl font-bold mb-4">Wheels</h1>
            
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
              
              <div className="bg-white rounded-lg border p-4 min-h-[600px]">
                <TabsContent value="trip-planner">
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Trip Planner</h2>
                    <p className="text-gray-600">
                      Interactive trip planning with maps, route optimization, and travel recommendations.
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-gray-500">Trip Planner components will be implemented here</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="fuel-log">
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Fuel Log</h2>
                    <p className="text-gray-600">
                      Track fuel consumption, costs, and efficiency for your journey.
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-gray-500">Fuel Log component will be implemented here</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="vehicle-maintenance">
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Vehicle Maintenance</h2>
                    <p className="text-gray-600">
                      Keep track of maintenance schedules, repairs, and vehicle health.
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-gray-500">Vehicle Maintenance component will be implemented here</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="rv-storage">
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold">RV Storage</h2>
                    <p className="text-gray-600">
                      Organize and manage your RV storage spaces and inventory.
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-gray-500">RV Storage Organizer component will be implemented here</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="caravan-safety">
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
  );
};

export default Wheels;
