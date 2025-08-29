
import "@/components/you/calendar-styles.css";
import UserCalendar from "@/components/UserCalendar";
import DashboardCards from "@/components/DashboardCards";
import WidgetArea from "@/components/WidgetArea";
import TrialStatusBanner from "@/components/subscription/TrialStatusBanner";
import SubscriptionStatusWidget from "@/components/subscription/SubscriptionStatusWidget";
// PAM Savings integration removed - will be replaced with simplified approach
import { EmotionalIntelligence } from "@/components/pam/EmotionalIntelligence";
import { PamHelpButton } from "@/components/pam/PamHelpButton";

const You = () => {

  return (
    <>
      {/* Main content */}
      <main className="container p-6">
        {/* Page Header with PAM Help */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Your Journey</h1>
          <PamHelpButton 
            page="you" 
            context="Personal dashboard and emotional well-being"
            variant="default"
          />
        </div>
        
        {/* Trial Status Banner */}
        <TrialStatusBanner />

        {/* PAM Savings integration will be added back with simplified approach */}

        {/* Adjusted for Pam sidebar */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - 75% on desktop */}
          <div className="w-full lg:w-3/4">
            <UserCalendar />
            <DashboardCards />
            <WidgetArea />
          </div>
          
          {/* Right Column - Subscription Status Widget + Emotional Intelligence */}
          <div className="w-full lg:w-1/4 space-y-6">
            {/* PAM Emotional Intelligence - You Node */}
            <EmotionalIntelligence />
            
            <SubscriptionStatusWidget />
          </div>
        </div>
      </main>

    </>
  );
};

export default You;
