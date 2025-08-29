
import { ReactNode } from "react";

interface TripPlannerLayoutProps {
  children: ReactNode;
}

export default function TripPlannerLayout({ children }: TripPlannerLayoutProps) {
  return (
    <div className="space-y-6">
      {children}
    </div>
  );
}
