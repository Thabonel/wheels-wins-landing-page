
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IntegratedTripState } from "./hooks/useIntegratedTripState";
import PAMTripChat from "./PAMTripChat";
import NavigationExportHub from "./NavigationExportHub";
import SocialSidebar from "./SocialSidebar";
import FriendsLayer from "./FriendsLayer";
import MeetupSuggestions from "./MeetupSuggestions";
import PAMTripSuggestions from "./PAMTripSuggestions";
import { Button } from "@/components/ui/button";
import { Users, MessageCircle, Download, DollarSign, X } from "lucide-react";

interface TripPlannerLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  showSidebar?: boolean;
  integratedState?: IntegratedTripState & {
    toggleFeature: (feature: 'budget' | 'social' | 'pam' | 'export') => void;
  };
}

export default function TripPlannerLayout({ 
  children, 
  sidebar, 
  showSidebar = false,
  integratedState
}: TripPlannerLayoutProps) {
  if (!integratedState) {
    // Fallback to simple layout if no integrated state
    return (
      <div className="flex flex-col lg:flex-row gap-6 min-h-screen">
        <div className={cn(
          "flex-1 space-y-6 transition-all duration-300",
          showSidebar ? "lg:mr-0" : "lg:mr-0"
        )}>
          {children}
        </div>
        {showSidebar && (
          <div className={cn(
            "w-full lg:w-96 lg:min-w-96 transition-all duration-300",
            "order-first lg:order-last",
            "lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)]",
            "lg:overflow-y-auto"
          )}>
            {sidebar}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col lg:flex-row gap-6 min-h-screen">
      {/* Feature Toggle Bar - Mobile */}
      <div className="lg:hidden bg-background border-b p-2">
        <div className="flex gap-2 justify-center">
          <Button
            size="sm"
            variant={integratedState.ui.showBudgetSidebar ? "default" : "outline"}
            onClick={() => integratedState.toggleFeature('budget')}
            className="flex-1"
          >
            <DollarSign className="w-4 h-4 mr-1" />
            Budget
          </Button>
          <Button
            size="sm"
            variant={integratedState.ui.showSocialSidebar ? "default" : "outline"}
            onClick={() => integratedState.toggleFeature('social')}
            className="flex-1"
          >
            <Users className="w-4 h-4 mr-1" />
            Social
          </Button>
          <Button
            size="sm"
            variant={integratedState.ui.showPAMChat ? "default" : "outline"}
            onClick={() => integratedState.toggleFeature('pam')}
            className="flex-1"
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            PAM
          </Button>
          <Button
            size="sm"
            variant={integratedState.ui.showExportModal ? "default" : "outline"}
            onClick={() => integratedState.toggleFeature('export')}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 space-y-6 transition-all duration-300 relative",
        (integratedState.ui.showBudgetSidebar || integratedState.ui.showSocialSidebar) 
          ? "lg:mr-0" : "lg:mr-0"
      )}>
        {children}

        {/* Map Overlays */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Friends Layer - Only render when map is available */}
          {/* FriendsLayer map={mapRef} isVisible={true} */}

          {/* PAM Suggestions Overlay */}
          {integratedState.pam.suggestions.length > 0 && (
            <div className="absolute top-4 left-4 right-4 pointer-events-auto">
              <PAMTripSuggestions />
            </div>
          )}

          {/* Meetup Suggestions */}
          {integratedState.social.meetupSuggestions.length > 0 && 
           integratedState.ui.showSocialSidebar && (
            <div className="absolute bottom-20 left-4 right-4 pointer-events-auto">
              <MeetupSuggestions 
                suggestions={integratedState.social.meetupSuggestions}
                onAcceptMeetup={(suggestion) => console.log('Accept meetup:', suggestion)}
                isVisible={true}
                onDismissMeetup={(suggestion) => console.log('Dismiss meetup:', suggestion)}
              />
            </div>
          )}
        </div>

        {/* Sync Status Indicator */}
        {!integratedState.sync && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-yellow-100 border border-yellow-300 rounded-lg px-4 py-2 text-sm text-yellow-800 pointer-events-auto">
            Syncing features...
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      {(integratedState.ui.showBudgetSidebar || integratedState.ui.showSocialSidebar) && (
        <div className={cn(
          "w-full lg:w-96 lg:min-w-96 transition-all duration-300",
          "order-first lg:order-last",
          "lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)]",
          "lg:overflow-y-auto"
        )}>
          <div className="space-y-4">
            {/* Feature Toggle Buttons - Desktop */}
            <div className="hidden lg:flex gap-2">
              <Button
                size="sm"
                variant={integratedState.ui.showBudgetSidebar ? "default" : "outline"}
                onClick={() => integratedState.toggleFeature('budget')}
                className="flex-1"
              >
                <DollarSign className="w-4 h-4 mr-1" />
                Budget
              </Button>
              <Button
                size="sm"
                variant={integratedState.ui.showSocialSidebar ? "default" : "outline"}
                onClick={() => integratedState.toggleFeature('social')}
                className="flex-1"
              >
                <Users className="w-4 h-4 mr-1" />
                Social
              </Button>
            </div>

            {/* Budget Sidebar */}
            {integratedState.ui.showBudgetSidebar && sidebar}

            {/* Social Sidebar */}
            {integratedState.ui.showSocialSidebar && (
              <SocialSidebar 
                friends={integratedState.social.friends}
                groupTrips={integratedState.social.groupTrips}
                onCreateGroupTrip={() => console.log('Create group trip')}
                isOpen={true}
                onClose={() => integratedState.toggleFeature('social')}
                calendarEvents={[]}
              />
            )}
          </div>
        </div>
      )}

      {/* PAM Chat Overlay */}
      {integratedState.ui.showPAMChat && (
        <div className="fixed bottom-4 right-4 w-80 h-96 z-50 animate-in slide-in-from-bottom-4">
          <div className="bg-background border rounded-lg shadow-lg h-full flex flex-col">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-semibold">PAM Assistant</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => integratedState.toggleFeature('pam')}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 min-h-0">
              <PAMTripChat />
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {integratedState.ui.showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Export Trip</h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => integratedState.toggleFeature('export')}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4">
              <NavigationExportHub 
                isOpen={true}
                onClose={() => integratedState.toggleFeature('export')}
                origin={{ name: "Origin", coordinates: [-122.4194, 37.7749] }}
                destination={{ name: "Destination", coordinates: [-118.2437, 34.0522] }}
                waypoints={[]}
                totalDistance={500}
                estimatedTime={8}
              />
            </div>
          </div>
        </div>
      )}

      {/* PAM Action Button - Always Visible */}
      <Button
        className="fixed bottom-4 left-4 rounded-full w-12 h-12 shadow-lg z-40"
        onClick={() => integratedState.toggleFeature('pam')}
        variant={integratedState.ui.showPAMChat ? "default" : "secondary"}
      >
        <MessageCircle className="w-5 h-5" />
      </Button>

      {/* Export Action Button */}
      <Button
        className="fixed bottom-4 left-20 rounded-full w-12 h-12 shadow-lg z-40"
        onClick={() => integratedState.toggleFeature('export')}
        variant={integratedState.ui.showExportModal ? "default" : "secondary"}
      >
        <Download className="w-5 h-5" />
      </Button>
    </div>
  );
}
