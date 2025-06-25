
import "@/components/you/calendar-styles.css";
import UserCalendar from "@/components/UserCalendar";
import DashboardCards from "@/components/DashboardCards";
import WidgetArea from "@/components/WidgetArea";
import TrialStatusBanner from "@/components/subscription/TrialStatusBanner";
import SubscriptionStatusWidget from "@/components/subscription/SubscriptionStatusWidget";

const You = () => {

  return (
    <>
      {/* Main content */}
      <main className="container p-6">
        {/* Trial Status Banner */}
        <TrialStatusBanner />

        {/* Adjusted for Pam sidebar */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - 75% on desktop */}
          <div className="w-full lg:w-3/4">
            <UserCalendar />
            <DashboardCards />
            <WidgetArea />
          </div>
          
          {/* Right Column - Subscription Status Widget */}
          <div className="w-full lg:w-1/4">
            <SubscriptionStatusWidget />
          </div>
        </div>
      </main>

    </>
  );
};

export default You;
