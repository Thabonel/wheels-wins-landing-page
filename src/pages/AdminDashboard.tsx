
import React, { useState } from 'react';
import AdminProtection from "@/components/admin/AdminProtection";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminContent from "@/components/admin/AdminContent";
import AdminPamChat from "@/components/admin/AdminPamChat";
import { useIsMobile } from "@/hooks/use-mobile";

const AdminDashboard: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [isPamChatOpen, setIsPamChatOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <AdminProtection>
      <div className="flex h-screen bg-gray-100 w-full overflow-hidden">
        <AdminHeader 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />

        <AdminSidebar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
        />

        {/* Main Content */}
        <main className={`
          flex-1 flex flex-col h-screen overflow-hidden
          ${isMobile ? 'pt-14' : 'pt-16 md:ml-64'}
        `}>
          <div className="flex-1 p-4 overflow-y-auto">
            <AdminContent activeSection={activeSection} />
          </div>
        </main>

        <AdminPamChat
          isPamChatOpen={isPamChatOpen}
          setIsPamChatOpen={setIsPamChatOpen}
        />
      </div>
    </AdminProtection>
  );
};

export default AdminDashboard;
