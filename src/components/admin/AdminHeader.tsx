import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AdminHeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const isMobile = useIsMobile();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    signOut();
  };

  const handleSettings = () => {
    toast.info('Navigating to admin settings...');
    // In a real app, this might open a settings modal or navigate to a settings page
    // For now, we'll just show a message since the admin panel uses its own settings
  };

  const handleSupport = () => {
    toast.info('Opening support center...');
    // In a real app, this might open a support modal, redirect to help docs, or create a support ticket
    window.open('mailto:support@wheelsandwins.com?subject=Admin Panel Support Request', '_blank');
  };

  const userInitials = user?.full_name 
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || 'AD';

  return (
    <>
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
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSettings}>Settings</DropdownMenuItem>
            <DropdownMenuItem onClick={handleSupport}>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
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
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSettings}>Settings</DropdownMenuItem>
            <DropdownMenuItem onClick={handleSupport}>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
    </>
  );
};

export default AdminHeader;