import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import PamAssistant from "@/components/PamAssistant";
import TripPlanner from "@/components/wheels/TripPlanner";
import FuelLog from "@/components/wheels/FuelLog";
import VehicleMaintenance from "@/components/wheels/VehicleMaintenance";
import RVStorageOrganizer from "@/components/wheels/RVStorageOrganizer";
import CaravanSafety from "@/components/wheels/CaravanSafety"; // 🆕 Import new safety component
import { useIsMobile } from "@/hooks/use-mobile";
import { useRegion } from "@/context/RegionContext";
import { useScrollReset } from "@/hooks/useScrollReset";

interface BaseFeature {
  title: string;
  available: boolean;
  component: JSX.Element;
}

interface RegionalFeature extends BaseFeature {
  comingSoon?: boolean;
}

type FeatureMap = {
  [key: string]: RegionalFeature;
};

export default function Wheels() {
  const [activeTab, setActiveTab] = useState("trip-planner");
  const isMobile = useIsMobile();
  const { region } = useRegion();
  useScrollReset([activeTab]);

  const user = {
    name: "John",
    avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png"
  };

  const getRegionalFeatures = (): FeatureMap => {
    const features: FeatureMap = {
      "trip-planner": {
        title: "Trip Planner",
        available: true,
        component: <TripPlanner />
      },
      "fuel-log": {
        title: "Fuel Log",
        available: ["Australia", "United States", "Canada", "New Zealand"].includes(region),
        component: <FuelLog />,
        comingSoon: !["Australia", "United States", "Canada", "New Zealand"].includes(region)
      },
      "caravan-safety": {
        title: "Caravan Safety",
        available: true,
        component: <CaravanSafety />
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
    return features;
  };

  const regionalFeatures = getRegionalFeatures();

  useEffect(() => {
    if (regionalFeatures[activeTab] && !regionalFeatures[activeTab].available) {
      const fallback = Object.keys(regionalFeatures).find(
        key => regionalFeatures[key].available
      );
      if (fallback) setActiveTab(fallback);
    }
  }, [region]);

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
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
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">
                        Coming Soon to {region}
                      </h3>
                      <p className="text-gray-500">
                        We're working on bringing this feature to your region. Check back soon!
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
