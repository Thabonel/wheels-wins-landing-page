import React from 'react';

interface TripPlannerLayoutProps {
  children: React.ReactNode;
}

export default function TripPlannerLayout({ children }: TripPlannerLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <main className="p-3 sm:p-4 md:p-6">
        <div className="max-w-none xl:max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}