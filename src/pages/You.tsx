
import "@/components/calendar/calendar-styles.css";
import UserCalendar from "@/components/UserCalendar";
import DashboardCards from "@/components/DashboardCards";
import WidgetArea from "@/components/WidgetArea";
import PamAssistant from "@/components/PamAssistant";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

const You = () => {
  // Mock user data for the layout
  const user = {
    name: "John",
    avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets//avatar-placeholder.png"
  };

  return (
    <main className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column - 75% on desktop */}
        <div className="w-full lg:w-3/4">
          {/* Safety Section Promo */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="bg-blue-100 p-4 rounded-full">
                <Shield className="h-10 w-10 text-blue-600" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold text-blue-800">Caravan Safety Guide</h2>
                <p className="text-blue-700 mb-4">
                  Learn how to balance your caravan, hitch correctly, reverse with confidence, and stay safe on the road.
                </p>
              </div>
              <Button asChild className="text-lg py-6 px-8">
                <Link to="/you/safety">View Safety Guide</Link>
              </Button>
            </div>
          </div>
          
          <UserCalendar />
          <DashboardCards />
          <WidgetArea />
        </div>

        {/* Right Column - 25% on desktop */}
        <div className="w-full lg:w-1/4 mt-6 lg:mt-0">
          <PamAssistant user={user} />
        </div>
      </div>
    </main>
  );
};

export default You;
