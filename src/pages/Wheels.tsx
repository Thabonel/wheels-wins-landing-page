import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const Wheels = () => {
  const [activeTab, setActiveTab] = useState("trip-planner");
  const isMobile = useIsMobile();

  const tabs = [
    { id: "trip-planner", label: "Trip Planner" },
    { id: "fuel-log", label: "Fuel Log" },
    { id: "caravan-safety", label: "Caravan Safety" },
    { id: "vehicle-maintenance", label: "Vehicle Maintenance" },
    { id: "rv-storage", label: "RV Storage Organizer" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "trip-planner":
        return (
          <div className="h-full">
            <h2 className="text-2xl font-bold mb-4">Interactive Trip Planner</h2>
            <p className="text-gray-600">Real trip planner coming soon...</p>
          </div>
        );
      case "fuel-log":
        return <div>Fuel Log component will go here</div>;
      case "caravan-safety":
        return <div>Caravan Safety component will go here</div>;
      case "vehicle-maintenance":
        return <div>Vehicle Maintenance component will go here</div>;
      case "rv-storage":
        return <div>RV Storage Organizer component will go here</div>;
      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full">
        <div className="flex flex-col lg:flex-row gap-6 h-full">
          {/* Main Content - 75% on desktop */}
          <div className="w-full lg:w-3/4 h-full bg-white rounded-lg shadow-sm border">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6 py-4" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
            
            {/* Tab Content */}
            <div className="p-6 h-full">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wheels;