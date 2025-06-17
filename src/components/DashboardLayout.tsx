// src/components/DashboardLayout.tsx
import React from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export default function DashboardLayout({ children, sidebar }: DashboardLayoutProps) {
 return (
 <div className="relative">
 {children}
      <div className="hidden lg:block absolute top-0 right-0 w-72">
 {sidebar}
      </div>
 </div>
  );
}
