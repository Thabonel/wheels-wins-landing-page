// src/components/DashboardLayout.tsx
import React from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export default function DashboardLayout({ children, sidebar }: DashboardLayoutProps) {
  return (
    <div className="flex gap-6">
      {/* Main area */}
      <div className="flex-1">
        {children}
      </div>
      {/* Sidebar – desktop only */}
      <div className="hidden lg:block w-72">
        {sidebar}
      </div>
    </div>
  );
}
