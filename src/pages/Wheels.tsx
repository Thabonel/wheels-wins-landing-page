
import { useIsMobile } from "@/hooks/use-mobile";
import TripPlanner from "@/components/wheels/TripPlanner";

const Wheels = () => {
  return (
    <div className="w-full h-full min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full">
        <div className="flex flex-col lg:flex-row gap-6 h-full">
          {/* Main Content - 75% on desktop */}
          <div className="w-full lg:w-3/4 h-full bg-white rounded-lg shadow-sm border p-6">
            <TripPlanner />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wheels;
