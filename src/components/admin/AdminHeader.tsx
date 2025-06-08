
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Menu } from 'lucide-react';
import { useIsMobile } from "@/hooks/use-mobile";

interface AdminHeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const isMobile = useIsMobile();

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
    </>
  );
};

export default AdminHeader;
