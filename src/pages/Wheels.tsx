// src/pages/Wheels.tsx
import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
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
    <DashboardLayout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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

          {Object.entries(regionalFeatures).map(([key, feature]) => (
            <TabsContent key={key} value={key}>
              {feature.comingSoon ? (
                <div className="text-center py-12">
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Coming Soon to {region}
                  </h3>
                  <p className="text-gray-500">We're working on bringing this feature to your region. Check back soon!</p>
                </div>
              ) : key === "trip-planner" ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Trip Planner + Weather */}
                  <div className="col-span-1 md:col-span-11 space-y-4">
                    <TripPlanner />
                    {coords && <WeatherWidget latitude={coords.latitude} longitude={coords.longitude} />}
                  </div>

                  {/* Directions panel */}
                  <div className="col-span-1 md:col-span-1">
                    <div
                      id="directions-panel"
                      className="bg-white rounded-lg border p-4 min-h-[600px] overflow-y-auto overflow-x-hidden"
                    />
                  </div>
                </div>
              ) : (
                feature.component
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
