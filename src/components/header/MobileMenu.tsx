
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import NavigationLinks from "./NavigationLinks";
import LoginButton from "./LoginButton";
import { toast } from "sonner";
import { User, Settings, LogOut } from "lucide-react";

interface MobileMenuProps {
  navItems: {
    id: string;
    label: string;
    path: string;
  }[];
  isHomePage: boolean;
}

const MobileMenu = ({ navItems, isHomePage }: MobileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  
  const handleClose = () => setIsOpen(false);

  const handleLogout = () => {
    logout();
    toast.info("You have been logged out");
    handleClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={isHomePage ? "text-white drop-shadow-md" : ""}
        >
          <Menu size={24} />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <nav className="flex flex-col gap-6 mt-8">
          <NavigationLinks 
            navItems={navItems} 
            isHomePage={false} 
            closeMobileMenu={handleClose}
            isMobile={true}
          />
          
          {isAuthenticated ? (
            <div className="mt-4">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{user?.name}</span>
              </div>
              
              <Button
                variant="outline"
                className="text-lg font-semibold flex items-center gap-2 px-6 py-5 w-full justify-center"
                onClick={() => {
                  toast.info("Profile page coming soon");
                  handleClose();
                }}
              >
                <User size={20} />
                <span>My Profile</span>
              </Button>
              
              <Button
                variant="outline"
                className="text-lg font-semibold flex items-center gap-2 px-6 py-5 mt-2 w-full justify-center"
                onClick={() => {
                  toast.info("Settings page coming soon");
                  handleClose();
                }}
              >
                <Settings size={20} />
                <span>Settings</span>
              </Button>
              
              <Button
                variant="destructive"
                className="text-lg font-semibold flex items-center gap-2 px-6 py-5 mt-2 w-full justify-center"
                onClick={handleLogout}
              >
                <LogOut size={20} />
                <span>Log Out</span>
              </Button>
            </div>
          ) : (
            <LoginButton isHomePage={false} isMobile={true} />
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;
