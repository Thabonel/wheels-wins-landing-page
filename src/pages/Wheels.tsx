
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import PamAssistant from "@/components/PamAssistant";
import TripPlanner from "@/components/wheels/TripPlanner";
import FuelLog from "@/components/wheels/FuelLog";
import VehicleMaintenance from "@/components/wheels/VehicleMaintenance";
import RVStorageOrganizer from "@/components/wheels/RVStorageOrganizer";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Wheels() {
  const [activeTab, setActiveTab] = useState("trip-planner");
  const isMobile = useIsMobile();
  
  // Mock user data for Pam assistant
  const user = {
    name: "John",
    avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png"
  };
  
  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-3xl font-bold mb-6 text-primary">Wheels Dashboard</h1>
      
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
              <TabsTrigger value="trip-planner" className="text-base py-3 px-6">
                Trip Planner
              </TabsTrigger>
              <TabsTrigger value="fuel-log" className="text-base py-3 px-6">
                Fuel Log
              </TabsTrigger>
              <TabsTrigger value="vehicle-maintenance" className="text-base py-3 px-6">
                Vehicle Maintenance
              </TabsTrigger>
              <TabsTrigger value="rv-storage" className="text-base py-3 px-6">
                RV Storage Organizer
              </TabsTrigger>
            </TabsList>
            
            <div className="bg-white rounded-lg border p-4 min-h-[600px]">
              <TabsContent value="trip-planner">
                <TripPlanner />
              </TabsContent>
              <TabsContent value="fuel-log">
                <FuelLog />
              </TabsContent>
              <TabsContent value="vehicle-maintenance">
                <VehicleMaintenance />
              </TabsContent>
              <TabsContent value="rv-storage">
                <RVStorageOrganizer />
              </TabsContent>
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
