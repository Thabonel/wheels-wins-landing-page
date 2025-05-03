
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import NavigationLinks from "./NavigationLinks";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

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
  const { user, isAuthenticated, logout, login } = useAuth();
  const navigate = useNavigate();
  
  const handleClose = () => setIsOpen(false);

  const handleLogout = () => {
    logout();
    toast.info("You have been logged out");
    handleClose();
  };

  const handleLogin = () => {
    login();
    toast.success("Successfully logged in");
    handleClose();
  };

  const handleAvatarClick = () => {
    navigate("/profile");
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
          {/* Only show navigation items when authenticated */}
          {isAuthenticated && (
            <>
              <NavigationLinks 
                navItems={navItems} 
                isHomePage={false} 
                closeMobileMenu={handleClose}
                isMobile={true}
              />
              
              <div className="mt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar 
                      className="w-10 h-10 cursor-pointer"
                      onClick={handleAvatarClick}
                    >
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user?.name}</span>
                  </div>
                </div>
                
                <Button
                  variant="destructive"
                  className="text-lg font-semibold flex items-center gap-2 px-6 py-5 mt-2 w-full justify-center"
                  onClick={handleLogout}
                >
                  <LogOut size={20} />
                  <span>Log Out</span>
                </Button>
              </div>
            </>
          )}
          
          {!isAuthenticated && (
            <Button
              variant="default"
              className="text-lg font-semibold flex items-center gap-2 px-6 py-5 w-full justify-center"
              onClick={handleLogin}
            >
              <span>Log In</span>
            </Button>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;
