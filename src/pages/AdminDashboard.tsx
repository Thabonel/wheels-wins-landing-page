
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, ShieldCheck, ShoppingBag, BarChart2, Settings as SettingsIcon, Menu, Bot, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserManagement from "@/components/admin/UserManagement";
import ContentModeration from "@/components/admin/ContentModeration";
import ShopManagement from "@/components/admin/ShopManagement";
import ReportsAnalytics from "@/components/admin/ReportsAnalytics";
import DashboardOverview from "@/components/admin/DashboardOverview";
import Settings from "@/components/admin/Settings";
import PAMAnalyticsDashboard from "@/components/admin/PAMAnalyticsDashboard";
import PamAssistant from "@/components/PamAssistant";
import { useIsMobile } from "@/hooks/use-mobile";

const AdminDashboard: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [isPamChatOpen, setIsPamChatOpen] = useState(false);
  const isMobile = useIsMobile();
 
  const sidebarVariants = {
    open: { x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
    closed: { x: "-100%", transition: { type: "spring", stiffness: 300, damping: 30 } },
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'user-management':
        return (
          <motion.div
            key="User Management"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
           <UserManagement />
          </motion.div>
        );
      case 'content-moderation':
        return (
          <motion.div
            key="Content Moderation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ContentModeration />
          </motion.div>
        );
      case 'shop-management':
        return (
          <motion.div
            key="Shop Management"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
           <ShopManagement />
          </motion.div>
        );
      case 'Reports & Analytics':
        return (
          <motion.div
            key="Reports & Analytics"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ReportsAnalytics />
          </motion.div>
        );
      case 'pam-analytics':
        return (
          <motion.div
            key="PAM Analytics"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PAMAnalyticsDashboard />
          </motion.div>
        );
      case 'Settings':
        return (
          <motion.div
            key="Settings"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Settings />
          </motion.div>
        );
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 w-full overflow-hidden">
      {/* Mobile Top Bar */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-md z-30 h-14 flex items-center justify-between px-4 md:hidden">
        <div className="flex items-center">
          <button className="mr-4" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold">Admin Panel</h1>
        </div>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger>
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback>JP</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Desktop Top Bar */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 bg-white shadow-md z-30 h-16 items-center justify-between px-4">
        <div className="flex items-center">
          <h1 className="text-xl font-bold">Admin Panel</h1>
        </div>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger>
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback>JP</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

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
            onClick={() => {
              setActiveSection('Dashboard');
              if (isMobile) setIsSidebarOpen(false);
            }}
          >
            <BarChart2 className="h-5 w-5 mr-3" />
            <span>Metrics</span>
          </button>
          <button
            className={`flex items-center p-3 rounded-md text-left ${activeSection === 'user-management' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            onClick={() => {
              setActiveSection('user-management');
              if (isMobile) setIsSidebarOpen(false);
            }}
          >
            <Users className="h-5 w-5 mr-3" />
            <span>User Management</span>
          </button>
          <button
            className={`flex items-center p-3 rounded-md text-left ${activeSection === 'content-moderation' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            onClick={() => {
              setActiveSection('content-moderation');
              if (isMobile) setIsSidebarOpen(false);
            }}
          >
            <ShieldCheck className="h-5 w-5 mr-3" />
            <span>Content Moderation</span>
          </button>
          <button
            className={`flex items-center p-3 rounded-md text-left ${activeSection === 'shop-management' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            onClick={() => {
              setActiveSection('shop-management');
              if (isMobile) setIsSidebarOpen(false);
            }}
          >
            <ShoppingBag className="h-5 w-5 mr-3" />
            <span>Shop Management</span>
          </button>
          <button
            className={`flex items-center p-3 rounded-md text-left ${activeSection === 'Reports & Analytics' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            onClick={() => {
              setActiveSection('Reports & Analytics');
              if (isMobile) setIsSidebarOpen(false);
            }}
          >
            <BarChart2 className="h-5 w-5 mr-3" />
            <span>Reports & Analytics</span>
          </button>
          <button
            className={`flex items-center p-3 rounded-md text-left ${activeSection === 'pam-analytics' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            onClick={() => {
              setActiveSection('pam-analytics');
              if (isMobile) setIsSidebarOpen(false);
            }}
          >
            <Bot className="h-5 w-5 mr-3" />
            <span>PAM Analytics</span>
          </button>
          <button
            className={`flex items-center p-3 rounded-md text-left ${activeSection === 'Settings' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            onClick={() => {
              setActiveSection('Settings');
              if (isMobile) setIsSidebarOpen(false);
            }}
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

      {/* Main Content */}
      <main className={`
        flex-1 flex flex-col h-screen overflow-hidden
        ${isMobile ? 'pt-14' : 'pt-16 md:ml-64'}
      `}>
        <div className="flex-1 p-4 overflow-y-auto">
          {renderContent()}
        </div>
      </main>

      {/* PAM Chat - Bottom Right (Mobile) or Sidebar (Desktop) */}
      {!isMobile && (
        <div className="fixed bottom-6 right-6 z-40">
          {isPamChatOpen ? (
            <div className="w-80 h-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col">
              <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-blue-50 rounded-t-lg">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-900">Admin PAM Assistant</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPamChatOpen(false)}
                  className="h-6 w-6 p-0 hover:bg-gray-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                <PamAssistant />
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setIsPamChatOpen(true)}
              className="h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              <MessageSquare className="h-6 w-6" />
            </Button>
          )}
        </div>
      )}

      {/* Mobile PAM Chat */}
      {isMobile && (
        <div className="fixed bottom-4 right-4 z-40">
          {isPamChatOpen ? (
            <div className="fixed inset-4 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-blue-50 rounded-t-lg">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-900">Admin PAM Assistant</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPamChatOpen(false)}
                  className="h-6 w-6 p-0 hover:bg-gray-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                <PamAssistant />
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setIsPamChatOpen(true)}
              className="h-12 w-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
