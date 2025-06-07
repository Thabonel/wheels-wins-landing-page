
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
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

const AdminDashboard: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [isPamChatOpen, setIsPamChatOpen] = useState(false);
 
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
    <div className="flex h-screen bg-gray-100 relative">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-md z-30 h-16 flex items-center justify-between px-4">
        <div className="flex items-center">
            <button className="mr-4 md:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                <Menu className="h-6 w-6" />
            </button>
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
        initial={{ x: '-100%' }}
        animate={isSidebarOpen ? 'open' : 'closed'}
        variants={sidebarVariants}
        className="fixed md:relative top-0 left-0 h-full w-64 bg-gray-800 text-white shadow-md z-20 pt-16"
      >
        <nav className="flex flex-col p-4 space-y-2">
          <button
            className={`flex items-center p-2 rounded-md ${activeSection === 'Dashboard' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            onClick={() => setActiveSection('Dashboard')}
          >
            <BarChart2 className="h-5 w-5 mr-2" />
            {isSidebarOpen && <span>Metrics</span>}
          </button>
          <button
            className={`flex items-center p-2 rounded-md ${activeSection === 'user-management' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            onClick={() => setActiveSection('user-management')}
          >
            <Users className="h-5 w-5 mr-2" />
            {isSidebarOpen && <span>User Management</span>}
          </button>
          <button
            className={`flex items-center p-2 rounded-md ${activeSection === 'content-moderation' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            onClick={() => setActiveSection('content-moderation')}
          >
            <ShieldCheck className="h-5 w-5 mr-2" />
            {isSidebarOpen && <span>Content Moderation</span>}
          </button>
          <button
            className={`flex items-center p-2 rounded-md ${activeSection === 'shop-management' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            onClick={() => setActiveSection('shop-management')}
          >
            <ShoppingBag className="h-5 w-5 mr-2" />
            {isSidebarOpen && <span>Shop Management</span>}
          </button>
          <button
            className={`flex items-center p-2 rounded-md ${activeSection === 'Reports & Analytics' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            onClick={() => setActiveSection('Reports & Analytics')}
          >
            <BarChart2 className="h-5 w-5 mr-2" />
            {isSidebarOpen && <span>Reports & Analytics</span>}
          </button>
          <button
            className={`flex items-center p-2 rounded-md ${activeSection === 'pam-analytics' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            onClick={() => setActiveSection('pam-analytics')}
          >
            <Bot className="h-5 w-5 mr-2" />
            {isSidebarOpen && <span>PAM Analytics</span>}
          </button>
          <button
            className={`flex items-center p-2 rounded-md ${activeSection === 'Settings' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            onClick={() => setActiveSection('Settings')}
          >
            <SettingsIcon className="h-5 w-5 mr-2" />
            {isSidebarOpen && <span>Settings</span>}
          </button>
        </nav>
      </motion.aside>

      {/* Main Content */}
      <main className={`flex-1 pt-16 transition-all duration-300 ${
        isSidebarOpen ? 'md:ml-64' : 'md:ml-0'
      }`}>
        <div className={`p-4 h-full overflow-auto ${isPamChatOpen ? 'pr-80' : 'pr-4'}`}>
          <div className="max-w-6xl">
            {renderContent()}
          </div>
        </div>
      </main>

      {/* Fixed Pam Chat Widget - Bottom Right */}
      <div className="fixed bottom-6 right-6 z-40">
        {isPamChatOpen ? (
          <div className="w-72 h-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col">
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
    </div>
  );
};

export default AdminDashboard;
