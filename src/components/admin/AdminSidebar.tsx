
import React from 'react';
import { motion } from 'framer-motion';
import { Users, ShieldCheck, ShoppingBag, BarChart2, Settings as SettingsIcon, Bot } from 'lucide-react';
import { useIsMobile } from "@/hooks/use-mobile";

interface AdminSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  activeSection: string;
  setActiveSection: (section: string) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  activeSection,
  setActiveSection
}) => {
  const isMobile = useIsMobile();

  const sidebarVariants = {
    open: { x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
    closed: { x: "-100%", transition: { type: "spring", stiffness: 300, damping: 30 } },
  };

  const handleSectionClick = (section: string) => {
    setActiveSection(section);
    if (isMobile) setIsSidebarOpen(false);
  };

  return (
    <>
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={isSidebarOpen || !isMobile ? 'open' : 'closed'}
        variants={sidebarVariants}
        className={`
          fixed md:relative top-0 left-0 h-full w-64 bg-gray-800 text-white shadow-md z-20
          ${isMobile ? 'pt-14' : 'pt-16'}
          ${!isMobile ? 'block' : ''}
        `}
      >
        <nav className="flex flex-col p-4 space-y-2 h-full overflow-y-auto">
          <button
            className={`flex items-center p-3 rounded-md text-left ${activeSection === 'Dashboard' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            onClick={() => handleSectionClick('Dashboard')}
          >
            <BarChart2 className="h-5 w-5 mr-3" />
            <span>Metrics</span>
          </button>
          <button
            className={`flex items-center p-3 rounded-md text-left ${activeSection === 'user-management' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            onClick={() => handleSectionClick('user-management')}
          >
            <Users className="h-5 w-5 mr-3" />
            <span>User Management</span>
          </button>
          <button
            className={`flex items-center p-3 rounded-md text-left ${activeSection === 'content-moderation' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            onClick={() => handleSectionClick('content-moderation')}
          >
            <ShieldCheck className="h-5 w-5 mr-3" />
            <span>Content Moderation</span>
          </button>
          <button
            className={`flex items-center p-3 rounded-md text-left ${activeSection === 'shop-management' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            onClick={() => handleSectionClick('shop-management')}
          >
            <ShoppingBag className="h-5 w-5 mr-3" />
            <span>Shop Management</span>
          </button>
          <button
            className={`flex items-center p-3 rounded-md text-left ${activeSection === 'Reports & Analytics' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            onClick={() => handleSectionClick('Reports & Analytics')}
          >
            <BarChart2 className="h-5 w-5 mr-3" />
            <span>Reports & Analytics</span>
          </button>
          <button
            className={`flex items-center p-3 rounded-md text-left ${activeSection === 'pam-analytics' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            onClick={() => handleSectionClick('pam-analytics')}
          >
            <Bot className="h-5 w-5 mr-3" />
            <span>PAM Analytics</span>
          </button>
          <button
            className={`flex items-center p-3 rounded-md text-left ${activeSection === 'Settings' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            onClick={() => handleSectionClick('Settings')}
          >
            <SettingsIcon className="h-5 w-5 mr-3" />
            <span>Settings</span>
          </button>
        </nav>
      </motion.aside>

      {/* Mobile Sidebar Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </>
  );
};

export default AdminSidebar;
