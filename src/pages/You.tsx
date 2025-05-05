import "@/components/calendar/calendar-styles.css";
import UserCalendar from "@/components/UserCalendar";
import DashboardCards from "@/components/DashboardCards";
import WidgetArea from "@/components/WidgetArea";
import PamAssistant from "@/components/PamAssistant";

const You = () => {
  const user = {
    name: "John",
    avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets//avatar-placeholder.png"
  };

  return (
    <main className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column - 75% on desktop */}
        <div className="w-full lg:w-3/4">
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
