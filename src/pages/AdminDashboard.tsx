import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Users, ShieldCheck, ShoppingBag, BarChart2, Settings as SettingsIcon, Menu } from 'lucide-react';
import UserManagement from "@/components/admin/UserManagement";
import ContentModeration from "@/components/admin/ContentModeration";
import ShopManagement from "@/components/admin/ShopManagement";
import ReportsAnalytics from "@/components/admin/ReportsAnalytics";
import DashboardOverview from "@/components/admin/DashboardOverview";
import Settings from "@/components/admin/Settings";

const AdminDashboard: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('Dashboard'); // Default to Dashboard
 
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
    <div className="flex h-screen bg-gray-100">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-md z-10 h-16 flex items-center justify-between px-4">
        <div className="flex items-center">
            <button className="mr-4 md:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold">Admin Panel</h1>
        </div>
        <DropdownMenu modal={false}> {/* Add modal={false} to prevent body scroll issues */}
          <DropdownMenuTrigger>
          <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" /> {/* Example avatar */}
              <AvatarFallback>JP</AvatarFallback>
            </Avatar> {/* Placeholder for avatar */}
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
        className="fixed md:relative top-0 left-0 h-full w-64 bg-gray-800 text-white shadow-md z-30 pt-16"
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
            className={`flex items-center p-2 rounded-md ${activeSection === 'User Management' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            onClick={() => setActiveSection('user-management')}
          >
            <Users className="h-5 w-5 mr-2" />
            {isSidebarOpen && <span>User Management</span>}
          </button>
          <button
            className={`flex items-center p-2 rounded-md ${activeSection === 'Content Moderation' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            onClick={() => setActiveSection('content-moderation')}
          >
            <ShieldCheck className="h-5 w-5 mr-2" />
            {isSidebarOpen && <span>Content Moderation</span>}
          </button>
          <button
            className={`flex items-center p-2 rounded-md ${activeSection === 'Shop Management' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
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
            className={`flex items-center p-2 rounded-md ${activeSection === 'Settings' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            onClick={() => setActiveSection('Settings')}
          >
            <SettingsIcon className="h-5 w-5 mr-2" />
            {isSidebarOpen && <span>Settings</span>}
          </button>
        </nav>
        </motion.aside>
      {/* Main Content */}
      <main
        className={`flex-1 p-8 pt-20 transition-all duration-300 ${isSidebarOpen ? 'ml-[200px]' : 'ml-[60px]'}`}
      >
         {/* On mobile, adjust margin based on sidebar state */}
        <div className="md:ml-0">
             {renderContent()}
        </div>
      </main>
    </div>
    );
};

export default AdminDashboard;