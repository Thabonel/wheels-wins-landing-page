
// src/pages/Wheels.tsx
import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import TripPlanner from "@/components/wheels/TripPlanner";
import FuelLog from "@/components/wheels/FuelLog";
import VehicleMaintenance from "@/components/wheels/VehicleMaintenance";
import RVStorageOrganizer from "@/components/wheels/RVStorageOrganizer";
import Safety from "@/pages/Safety";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRegion } from "@/context/RegionContext";
import { useScrollReset } from "@/hooks/useScrollReset";
import WeatherWidget from "@/components/wheels/WeatherWidget";

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

  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => setCoords({ latitude: coords.latitude, longitude: coords.longitude }),
        (error) => setGeoError(error.message)
      );
    } else {
      setGeoError("Geolocation is not supported");
    }
  }, []);

  const getRegionalFeatures = (): FeatureMap => ({
    "trip-planner": { title: "Trip Planner", available: true, component: <TripPlanner /> },
    "fuel-log": {
      title: "Fuel Log",
      available: ["Australia", "United States", "Canada", "New Zealand"].includes(region),
      component: <FuelLog />,
      comingSoon: !["Australia", "United States", "Canada", "New Zealand"].includes(region),
    },
    "caravan-safety": { title: "Caravan Safety", available: true, component: <Safety /> },
    "vehicle-maintenance": { title: "Vehicle Maintenance", available: true, component: <VehicleMaintenance /> },
    "rv-storage": { title: "RV Storage Organizer", available: true, component: <RVStorageOrganizer /> },
  });

  const regionalFeatures = getRegionalFeatures();

  useEffect(() => {
    if (regionalFeatures[activeTab] && !regionalFeatures[activeTab].available) {
      const fallback = Object.keys(regionalFeatures).find((key) => regionalFeatures[key].available);
      if (fallback) setActiveTab(fallback);
    }
  }, [region]);

  return (
    <div className="w-full h-full overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
        {/* Tab navigation - only show for non-trip-planner tabs */}
        {activeTab !== "trip-planner" && (
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <TabsList className="w-full justify-start flex-wrap mb-6">
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
          </div>
        )}

        {/* Tab content */}
        {Object.entries(regionalFeatures).map(([key, feature]) => (
          <TabsContent key={key} value={key} className="flex-1 overflow-hidden">
            {feature.comingSoon ? (
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center py-12">
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Coming Soon to {region}
                </h3>
                <p className="text-gray-500">We're working on bringing this feature to your region. Check back soon!</p>
              </div>
            ) : key === "trip-planner" ? (
              <div className="h-full flex flex-col">
                {/* Trip planner tab navigation */}
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
                  <TabsList className="w-full justify-start flex-wrap mb-4">
                    {Object.entries(regionalFeatures).map(([tabKey, tabFeature]) => (
                      <TabsTrigger
                        key={tabKey}
                        value={tabKey}
                        className="text-base py-3 px-6 relative"
                        disabled={!tabFeature.available}
                      >
                        {tabFeature.title}
                        {tabFeature.comingSoon && (
                          <Badge className="ml-2 bg-amber-500 absolute -top-2 -right-2 text-[10px]">
                            Coming Soon
                          </Badge>
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                
                {/* Trip planner content */}
                <div className="flex-1 overflow-hidden">
                  <TripPlanner />
                  {coords && !isMobile && (
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
                      <WeatherWidget latitude={coords.latitude} longitude={coords.longitude} />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {feature.component}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
