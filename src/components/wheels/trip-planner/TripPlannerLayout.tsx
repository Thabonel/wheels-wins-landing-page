
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TripPlannerLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  showSidebar?: boolean;
}

export default function TripPlannerLayout({ 
  children, 
  sidebar, 
  showSidebar = false 
}: TripPlannerLayoutProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-screen">
      {/* Main Content Area - Left Side */}
      <div className={cn(
        "flex-1 space-y-6 transition-all duration-300",
        showSidebar ? "lg:mr-0" : "lg:mr-0"
      )}>
        {children}
      </div>

      {/* Budget Sidebar - Right Side */}
      {showSidebar && (
        <div className={cn(
          "w-full lg:w-96 lg:min-w-96 transition-all duration-300",
          "order-first lg:order-last", // Show at top on mobile, right on desktop
          "lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)]",
          "lg:overflow-y-auto"
        )}>
          {sidebar}
        </div>
      )}
    </div>
  );
}
