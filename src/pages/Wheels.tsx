
import { useState, lazy, Suspense } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { TabTransition } from "@/components/common/TabTransition";
import { PAMProvider } from "@/components/wheels/trip-planner/PAMContext";
import { TripPlannerErrorBoundary } from "@/components/common/TripPlannerErrorBoundary";
import { PAMErrorBoundary } from "@/components/common/PAMErrorBoundary";
import { PamHelpButton } from "@/components/pam/PamHelpButton";

// Lazy load heavy components to reduce initial bundle size
const TripPlannerApp = lazy(() => 
  import('@/components/wheels/TripPlannerApp').catch(() => ({
    default: () => <div className="p-4 text-red-600">Failed to load Trip Planner</div>
  }))
);
const FreshTripPlanner = lazy(() => 
  import('@/components/wheels/trip-planner/fresh/FreshTripPlanner').catch(() => ({
    default: () => <div className="p-4 text-red-600">Failed to load Trip Planner 2</div>
  }))
);
const FuelLog = lazy(() => 
  import("@/components/wheels/FuelLog").catch(() => ({
    default: () => <div className="p-4 text-red-600">Failed to load Fuel Log</div>
  }))
);
const VehicleMaintenance = lazy(() => 
  import("@/components/wheels/VehicleMaintenance").catch(() => ({
    default: () => <div className="p-4 text-red-600">Failed to load Vehicle Maintenance</div>
  }))
);
const RVStorageOrganizer = lazy(() => 
  import("@/components/wheels/RVStorageOrganizer").catch(() => ({
    default: () => <div className="p-4 text-red-600">Failed to load RV Storage Organizer</div>
  }))
);
const CaravanSafety = lazy(() => 
  import("@/components/wheels/CaravanSafety").catch(() => ({
    default: () => <div className="p-4 text-red-600">Failed to load Caravan Safety</div>
  }))
);

const Wheels = () => {
  const [activeTab, setActiveTab] = useState("trip-planner");
  const isMobile = useIsMobile();
  
  const tabs = [
    {
      id: "trip-planner",
      label: "Trip Planner"
    },
    {
      id: "fresh-planner",
      label: "Trip Planner 2"
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
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Travel Planning</h1>
              <PamHelpButton 
                page="wheels" 
                context={`Currently viewing ${activeTab.replace('-', ' ')}`}
                variant="default"
              />
            </div>
            
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
                <TabTransition activeTab={activeTab} tabId="trip-planner" className="mt-0">
                  <TripPlannerErrorBoundary>
                    <PAMErrorBoundary>
                      <PAMProvider>
                        <Suspense fallback={
                          <div className="flex items-center justify-center h-96">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            <span className="ml-3 text-gray-600">Loading Trip Planner...</span>
                          </div>
                        }>
                          <TripPlannerApp />
                        </Suspense>
                      </PAMProvider>
                    </PAMErrorBoundary>
                  </TripPlannerErrorBoundary>
                </TabTransition>
                
                <TabTransition activeTab={activeTab} tabId="fresh-planner" className="mt-0">
                  <TripPlannerErrorBoundary>
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-96">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Loading Fresh Trip Planner...</span>
                      </div>
                    }>
                      <div className="h-[600px] bg-white rounded-lg overflow-hidden">
                        <FreshTripPlanner 
                          onSaveTrip={async (tripData) => {
                            console.log('Saving trip:', tripData);
                            // This will be connected to Supabase later
                          }}
                        />
                      </div>
                    </Suspense>
                  </TripPlannerErrorBoundary>
                </TabTransition>
                
                <TabTransition activeTab={activeTab} tabId="fuel-log" className="mt-0">
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-96">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">Loading Fuel Log...</span>
                    </div>
                  }>
                    <FuelLog />
                  </Suspense>
                </TabTransition>
                
                <TabTransition activeTab={activeTab} tabId="vehicle-maintenance" className="mt-0">
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-96">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">Loading Vehicle Maintenance...</span>
                    </div>
                  }>
                    <VehicleMaintenance />
                  </Suspense>
                </TabTransition>
                
                <TabTransition activeTab={activeTab} tabId="rv-storage" className="mt-0">
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-96">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">Loading RV Storage...</span>
                    </div>
                  }>
                    <RVStorageOrganizer />
                  </Suspense>
                </TabTransition>
                
                <TabTransition activeTab={activeTab} tabId="caravan-safety" className="mt-0">
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-96">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">Loading Safety Information...</span>
                    </div>
                  }>
                    <CaravanSafety />
                  </Suspense>
                </TabTransition>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wheels;
