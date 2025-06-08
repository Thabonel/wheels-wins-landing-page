import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Menu,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { BarChart2, Users, ShieldCheck, ShoppingBag, Bot, SettingsIcon, X, MessageSquare } from 'lucide-react';
import AdminProtection from '@/components/admin/AdminProtection';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminContent from '@/components/admin/AdminContent';
import AdminPamChat from '@/components/admin/AdminPamChat';
import { useIsMobile } from '@/hooks/use-mobile';
import { sidebarVariants } from '@/config/sidebarVariants';
import PamAssistant from '@/components/admin/PamAssistant';

const AdminDashboard: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [isPamChatOpen, setIsPamChatOpen] = useState(false);
  const isMobile = useIsMobile();

  const renderContent = () => (
    <AdminContent activeSection={activeSection} />
  );

  return (
    <AdminProtection>
      <div className="flex h-screen bg-gray-100 w-full overflow-hidden">

        {/* Mobile Top Bar - Only show menu button and user avatar */}
        {isMobile && (
          <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-30 h-14 flex items-center justify-between px-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <Menu className="h-6 w-6" />
            </button>
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
        )}

        {/* Sidebar */}
        <motion.aside
          initial={false}
          animate={isSidebarOpen || !isMobile ? 'open' : 'closed'}
          variants={sidebarVariants}
          className={`
            fixed md:relative top-0 left-0 h-full w-64 bg-gray-800 text-white shadow-lg z-20
            ${isMobile ? 'pt-14' : 'pt-0'}
            ${!isMobile ? 'block' : ''}
          `}
        >
          {/* Desktop header inside sidebar */}
          {!isMobile && (
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h1 className="text-lg font-bold">Admin Panel</h1>
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
            </div>
          )}

          <nav className="flex flex-col p-4 space-y-2 h-full overflow-y-auto">
            {[
              { key: 'Dashboard', icon: BarChart2, label: 'Metrics' },
              { key: 'user-management', icon: Users, label: 'User Management' },
              { key: 'content-moderation', icon: ShieldCheck, label: 'Content Moderation' },
              { key: 'shop-management', icon: ShoppingBag, label: 'Shop Management' },
              { key: 'Reports & Analytics', icon: BarChart2, label: 'Reports & Analytics' },
              { key: 'pam-analytics', icon: Bot, label: 'PAM Analytics' },
              { key: 'Settings', icon: SettingsIcon, label: 'Settings' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                className={`flex items-center p-3 rounded-md text-left ${
                  activeSection === key ? 'bg-gray-700' : 'hover:bg-gray-700'
                }`}
                onClick={() => {
                  setActiveSection(key);
                  if (isMobile) setIsSidebarOpen(false);
                }}
              >
                <Icon className="h-5 w-5 mr-3" />
                <span>{label}</span>
              </button>
            ))}
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
        <main
          className={`
            flex-1 flex flex-col h-screen overflow-hidden
            ${isMobile ? 'pt-14' : 'md:ml-0'}
          `}
        >
          <div className="flex-1 p-6 overflow-y-auto">
            {renderContent()}
          </div>
        </main>

        {/* PAM Chat */}
        <div className="fixed bottom-6 right-6 z-40">
          {isPamChatOpen ? (
            <div
              className={`bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col ${
                isMobile ? 'fixed inset-4 max-h-[80vh]' : 'w-80 h-96'
              }`}
            >
              <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-blue-50 rounded-t-lg">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-900">PAM Assistant</span>
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
              className={`rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white ${
                isMobile ? 'h-12 w-12' : 'h-14 w-14'
              }`}
            >
              <MessageSquare className={isMobile ? 'h-5 w-5' : 'h-6 w-6'} />
            </Button>
          )}
        </div>

      </div>
    </AdminProtection>
  );
};

export default AdminDashboard;
