
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
import { Calendar, Heart, DollarSign, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { pamSavingsApi, formatSavingsAmount } from "@/services/pamSavingsService";

const You = () => {
  // Query for PAM savings data with fallback
  const { data: guaranteeStatus, isLoading: savingsLoading, error: savingsError } = useQuery({
    queryKey: ['guarantee-status'],
    queryFn: () => pamSavingsApi.getGuaranteeStatus(),
    refetchInterval: 60000, // Refresh every minute
    retry: 2,
    // Fallback to mock data when API unavailable
    onError: (error) => {
      console.warn('PAM Savings API unavailable, using fallback data:', error);
    }
  });

  // Mock data for when API is unavailable (staging environment)
  const mockSavingsData = {
    guarantee_met: true,
    total_savings: 18.50,
    subscription_cost: 14.00,
    savings_shortfall: 0,
    savings_events_count: 3,
    percentage_achieved: 132,
    billing_period_start: new Date().toISOString().split('T')[0],
    billing_period_end: new Date().toISOString().split('T')[0]
  };

  // Use mock data if API fails or in development
  const displayData = guaranteeStatus || (savingsError ? mockSavingsData : null);

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
          <div className="flex flex-col sm:flex-row gap-4 items-start">
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

            {/* Compact PAM Savings Card */}
            {!savingsLoading && displayData && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 ${
                displayData.guarantee_met
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:from-green-100 hover:to-emerald-100'
                  : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100'
              }`}>
                {displayData.guarantee_met ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                  <DollarSign className="w-5 h-5 text-blue-600" />
                )}
                <div className="flex flex-col">
                  <span className={`text-sm font-semibold ${
                    displayData.guarantee_met ? 'text-green-700' : 'text-blue-700'
                  }`}>
                    {displayData.guarantee_met
                      ? formatSavingsAmount(displayData.total_savings)
                      : `${formatSavingsAmount(displayData.total_savings)} / ${formatSavingsAmount(displayData.subscription_cost)}`
                    }
                  </span>
                  <span className="text-xs text-gray-600">
                    {displayData.guarantee_met
                      ? 'Subscription paid!'
                      : `${Math.round(displayData.percentage_achieved)}% to goal`
                    }
                    {savingsError && ' (demo)'}
                  </span>
                </div>
              </div>
            )}

            {/* Loading state for savings card */}
            {savingsLoading && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 animate-pulse">
                <div className="w-5 h-5 bg-gray-300 rounded"></div>
                <div className="flex flex-col gap-1">
                  <div className="w-20 h-4 bg-gray-300 rounded"></div>
                  <div className="w-16 h-3 bg-gray-300 rounded"></div>
                </div>
              </div>
            )}
          </div>

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
