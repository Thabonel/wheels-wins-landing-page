
import "@/components/you/calendar-styles.css";
import UserCalendar from "@/components/UserCalendar";
import DashboardCards from "@/components/DashboardCards";
import WidgetArea from "@/components/WidgetArea";
import TrialStatusBanner from "@/components/subscription/TrialStatusBanner";
import SubscriptionStatusWidget from "@/components/subscription/SubscriptionStatusWidget";
// PAM Savings integration removed - will be replaced with simplified approach
import { EmotionalIntelligence } from "@/components/pam/EmotionalIntelligence";
import { PamHelpButton } from "@/components/pam/PamHelpButton";
import { MedicalDashboard } from "@/components/you/medical/MedicalDashboard";
import { MedicalProvider } from "@/contexts/MedicalContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Heart } from "lucide-react";

const You = () => {

  return (
    <MedicalProvider>
      {/* Main content */}
      <main className="container p-6">
        {/* Page Header with PAM Help */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Your Journey</h1>
          <PamHelpButton 
            page="you" 
            context="Personal dashboard, calendar, and medical records"
            variant="default"
          />
        </div>
        
        {/* Trial Status Banner */}
        <TrialStatusBanner />

        {/* PAM Savings integration will be added back with simplified approach */}

        {/* Tabs for Calendar and Medical */}
        <Tabs defaultValue="calendar" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="medical" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Medical Records
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-0">
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
          </TabsContent>

          <TabsContent value="medical" className="space-y-0">
            <MedicalDashboard />
          </TabsContent>
        </Tabs>
      </main>
    </MedicalProvider>
  );
};

export default You;
