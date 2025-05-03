
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/AuthContext";
import { useHeaderAppearance } from "@/hooks/useHeaderAppearance";
import { useNavigate, NavLink } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { LogIn, LogOut, Menu } from "lucide-react";

// Define navigation items for the entire app
export const navItems = [
  { id: "you", label: "You", path: "/you" },
  { id: "wheels", label: "Wheels", path: "/wheels" },
  { id: "wins", label: "Wins", path: "/wins" },
  { id: "social", label: "Social", path: "/social" },
  { id: "shop", label: "Shop", path: "/shop" }
];

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const { user, isAuthenticated, login, logout } = useAuth();
  const { isHomePage, isScrolled } = useHeaderAppearance();
  const navigate = useNavigate();
  
  const handleClose = () => setIsOpen(false);

  const handleLogin = () => {
    login();
    toast.success("Successfully logged in");
    handleClose();
  };

  const handleLogout = () => {
    logout();
    toast.info("You have been logged out");
    handleClose();
  };

  const handleAvatarClick = () => {
    navigate("/profile");
    handleClose();
  };

  // Determine header background styling
  const headerBgClass = isHomePage && !isScrolled 
    ? "bg-transparent" 
    : "bg-white border-b border-gray-200";

  // Shadow class to apply when header is scrolled or not on home page
  const headerShadowClass = isHomePage && !isScrolled
    ? ""
    : "shadow-sm";

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerBgClass} ${headerShadowClass}`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between h-16 md:h-20">
        {/* Logo - fixed width with proper shadow for contrast */}
        <div className="flex-shrink-0 w-[180px]">
          <img
            src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/wheels%20and%20wins%20Logo%20alpha.png"
            alt="Wheels & Wins Logo"
            className={`h-14 object-contain transition-all ${isHomePage && !isScrolled ? "drop-shadow-md" : ""}`}
          />
        </div>

        {/* Mobile Navigation */}
        {isMobile ? (
          <MobileMenuComponent 
            isOpen={isOpen} 
            setIsOpen={setIsOpen} 
            isHomePage={isHomePage} 
            handleLogin={handleLogin} 
            handleLogout={handleLogout} 
            handleAvatarClick={handleAvatarClick} 
            handleClose={handleClose}
          />
        ) : (
          <>
            {/* Desktop Navigation Links - Only show on non-home pages when authenticated */}
            {!isHomePage && isAuthenticated && (
              <nav className="hidden md:flex items-center justify-center space-x-8 flex-grow">
                <NavigationLinksComponent navItems={navItems} isHomePage={isHomePage} />
              </nav>
            )}

            {/* Auth Section - fixed width for balance */}
            <div className="hidden md:flex items-center justify-end w-[180px]">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <UserMenuComponent isHomePage={isHomePage} handleAvatarClick={handleAvatarClick} />
                  <LogoutButtonComponent isHomePage={isHomePage} handleLogout={handleLogout} />
                </div>
              ) : (
                /* Only show login button */
                <LoginButtonComponent isHomePage={isHomePage} handleLogin={handleLogin} />
              )}
            </div>
          </>
        )}

        {/* Mobile-only user menu */}
        {isMobile && (
          <div className="md:hidden">
            {isAuthenticated ? (
              <UserMenuComponent isHomePage={isHomePage} handleAvatarClick={handleAvatarClick} isMobile={true} />
            ) : (
              <LoginButtonComponent isHomePage={isHomePage} handleLogin={handleLogin} isMobile={true} />
            )}
          </div>
        )}
      </div>
    </header>
  );
};

// Component extracted from NavigationLinks.tsx
const NavigationLinksComponent = ({ 
  navItems, 
  isHomePage, 
  closeMobileMenu 
}: { 
  navItems: Array<{id: string, label: string, path: string}>,
  isHomePage: boolean,
  closeMobileMenu?: () => void,
  isMobile?: boolean
}) => {
  return (
    <>
      {navItems.map((item) => (
        <NavLink
          key={item.id}
          to={item.path}
          className={({ isActive }) => {
            const baseClass = isHomePage
              ? "text-white hover:text-blue-200 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]"
              : "text-gray-500 hover:text-blue-600";
              
            const activeClass = isHomePage
              ? "text-white font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]"
              : "text-blue-600 font-semibold";
              
            return `text-lg font-semibold transition-colors ${
              isActive ? activeClass : baseClass
            }`;
          }}
          onClick={closeMobileMenu}
        >
          {item.label}
        </NavLink>
      ))}
    </>
  );
};

// Component extracted from UserMenu.tsx
const UserMenuComponent = ({ 
  isHomePage, 
  handleAvatarClick,
  isMobile = false 
}: { 
  isHomePage: boolean, 
  handleAvatarClick: () => void,
  isMobile?: boolean 
}) => {
  const { user } = useAuth();

  return (
    <Button 
      variant="ghost" 
      className="rounded-full p-0 w-10 h-10 overflow-hidden"
      aria-label="User profile"
      onClick={handleAvatarClick}
    >
      <Avatar className="w-10 h-10">
        <AvatarImage src={user?.avatar} alt={user?.name} />
        <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
      </Avatar>
    </Button>
  );
};

// Component extracted from LoginButton.tsx
const LoginButtonComponent = ({ 
  isHomePage, 
  handleLogin,
  isMobile = false 
}: { 
  isHomePage: boolean,
  handleLogin: () => void,
  isMobile?: boolean 
}) => {
  return (
    <Button
      variant={isHomePage ? "outline" : "secondary"}
      className={`${isMobile ? "text-base font-semibold px-4 py-2" : "text-lg font-semibold px-6 py-5"} 
        flex items-center gap-${isMobile ? "1" : "2"} 
        ${isHomePage ? "bg-transparent border-white text-white hover:bg-white/20 drop-shadow-md" : ""}`}
      onClick={handleLogin}
    >
      <LogIn size={isMobile ? 16 : 20} />
      <span>Log In</span>
    </Button>
  );
};

// Component extracted from LogoutButton.tsx
const LogoutButtonComponent = ({ 
  isHomePage,
  handleLogout
}: { 
  isHomePage: boolean,
  handleLogout: () => void
}) => {
  const buttonClass = isHomePage
    ? "bg-transparent border-white text-white hover:bg-white/20 drop-shadow-md"
    : "";

  return (
    <Button
      variant="outline"
      className={`font-semibold flex items-center gap-2 ${buttonClass}`}
      onClick={handleLogout}
    >
      <LogOut size={18} />
      <span>Log Out</span>
    </Button>
  );
};

// Component extracted from MobileMenu.tsx
const MobileMenuComponent = ({ 
  isOpen,
  setIsOpen,
  isHomePage,
  handleLogin,
  handleLogout,
  handleAvatarClick,
  handleClose
}: { 
  isOpen: boolean,
  setIsOpen: (open: boolean) => void,
  isHomePage: boolean,
  handleLogin: () => void,
  handleLogout: () => void,
  handleAvatarClick: () => void,
  handleClose: () => void
}) => {
  const { user, isAuthenticated } = useAuth();

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
              <NavigationLinksComponent 
                navItems={navItems} 
                isHomePage={false} 
                closeMobileMenu={handleClose} 
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
              <LogIn size={20} />
              <span>Log In</span>
            </Button>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default Header;
