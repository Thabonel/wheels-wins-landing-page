
import React, { useState } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import AdminProtection from '@/components/admin/AdminProtection';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminContent from '@/components/admin/AdminContent';
import AdminPamChat from '@/components/admin/AdminPamChat';
import { useIsMobile } from '@/hooks/use-mobile';

const AdminDashboard: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [isPamChatOpen, setIsPamChatOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <ErrorBoundary>
      <AdminProtection>
        <div className="flex h-screen bg-gray-100 w-full overflow-hidden">
          {/* Header */}
          <AdminHeader 
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
          />

          {/* Sidebar */}
          <AdminSidebar
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
          />

          {/* Main Content */}
          <main
            className={`
              flex-1 flex flex-col h-screen overflow-hidden
              ${isMobile ? 'pt-14' : 'lg:ml-64 pt-16'}
            `}
          >
            <div className="flex-1 p-6 overflow-y-auto">
              <ErrorBoundary>
                <AdminContent activeSection={activeSection} />
              </ErrorBoundary>
            </div>
          </main>

          {/* PAM Chat */}
          <ErrorBoundary>
            <AdminPamChat
              isPamChatOpen={isPamChatOpen}
              setIsPamChatOpen={setIsPamChatOpen}
            />
          </ErrorBoundary>
        </div>
      </AdminProtection>
    </ErrorBoundary>
  );
};

export default AdminDashboard;
