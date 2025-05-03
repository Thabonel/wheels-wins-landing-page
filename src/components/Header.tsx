
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, User, Settings, Menu } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/AuthContext";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

const Header = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, isAuthenticated, login, logout } = useAuth();
  
  // Track scroll position to potentially add background on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 60) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  const navItems = [
    { id: "you", label: "You", path: "/you" },
    { id: "wheels", label: "Wheels", path: "/wheels" },
    { id: "wins", label: "Wins", path: "/wins" },
    { id: "social", label: "Social", path: "/social" },
    { id: "shop", label: "Shop", path: "/shop" }
  ];

  const isHomePage = location.pathname === "/";

  const handleLogin = () => {
    login();
    toast.success("Successfully logged in");
  };

  const handleLogout = () => {
    logout();
    toast.info("You have been logged out");
  };

  const handleProfileClick = () => {
    toast.info("Profile page coming soon");
  };

  const handleSettingsClick = () => {
    toast.info("Settings page coming soon");
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-24 ${
        isScrolled && isHomePage 
          ? "bg-white/90 backdrop-blur-sm shadow-sm" 
          : isHomePage 
            ? "bg-transparent" 
            : "bg-white/90 backdrop-blur-sm shadow-sm"
      }`}
    >
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex justify-between items-center h-full">
          {/* Logo - fixed width with proper shadow for contrast */}
          <div className="flex-shrink-0 w-[180px]">
            <NavLink to="/">
              <img
                src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/wheels%20and%20wins%20Logo%20alpha.png"
                alt="Wheels & Wins Logo"
                className={`h-14 object-contain ${isHomePage ? "drop-shadow-md" : ""}`}
              />
            </NavLink>
          </div>

          {/* Mobile Navigation */}
          {isMobile ? (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
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
                  {navItems.map((item) => (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      className={({ isActive }) => 
                        `text-xl font-semibold transition-colors ${
                          isActive ? "text-blue-600" : "text-gray-500 hover:text-blue-600"
                        }`
                      }
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                  
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
                          handleProfileClick();
                          setIsOpen(false);
                        }}
                      >
                        <User size={20} />
                        <span>My Profile</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="text-lg font-semibold flex items-center gap-2 px-6 py-5 mt-2 w-full justify-center"
                        onClick={() => {
                          handleSettingsClick();
                          setIsOpen(false);
                        }}
                      >
                        <Settings size={20} />
                        <span>Settings</span>
                      </Button>
                      
                      <Button
                        variant="destructive"
                        className="text-lg font-semibold flex items-center gap-2 px-6 py-5 mt-2 w-full justify-center"
                        onClick={() => {
                          handleLogout();
                          setIsOpen(false);
                        }}
                      >
                        <LogOut size={20} />
                        <span>Log Out</span>
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      className="text-lg font-semibold flex items-center gap-2 px-6 py-5 mt-4 w-full justify-center"
                      onClick={() => {
                        handleLogin();
                        setIsOpen(false);
                      }}
                    >
                      <LogIn size={20} />
                      <span>Log In</span>
                    </Button>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          ) : (
            <>
              {/* Desktop Navigation - centered with flex-grow */}
              <nav className="hidden md:flex items-center justify-center space-x-8 flex-grow">
                {navItems.map((item) => (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={({ isActive }) => 
                      `text-lg font-semibold transition-colors ${
                        isActive 
                          ? "text-blue-600" 
                          : isHomePage 
                            ? "text-white hover:text-blue-200 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" 
                            : "text-gray-500 hover:text-blue-600"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              {/* Auth Section - fixed width for balance */}
              <div className="hidden md:block w-[180px] text-right">
                {isAuthenticated ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="rounded-full p-0 w-10 h-10 overflow-hidden"
                        aria-label="User menu"
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user?.avatar} alt={user?.name} />
                          <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="flex items-center gap-2 p-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user?.avatar} alt={user?.name} />
                          <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <p className="text-sm font-medium leading-none">{user?.name}</p>
                          <p className="text-xs text-muted-foreground">{user?.email}</p>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="cursor-pointer" onClick={handleProfileClick}>
                        <User className="mr-2 h-4 w-4" />
                        <span>My Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer" onClick={handleSettingsClick}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="cursor-pointer text-red-600" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    variant={isHomePage ? "outline" : "secondary"}
                    className={`text-lg font-semibold flex items-center gap-2 px-6 py-5 ${
                      isHomePage ? "bg-transparent border-white text-white hover:bg-white/20 drop-shadow-md" : ""
                    }`}
                    onClick={handleLogin}
                  >
                    <LogIn size={20} />
                    <span>Log In</span>
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Mobile-only login button or avatar (when menu is closed) */}
          {isMobile && !isOpen && (
            <>
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="rounded-full p-0 w-10 h-10 overflow-hidden"
                      aria-label="User menu"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user?.avatar} alt={user?.name} />
                        <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="flex items-center gap-2 p-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user?.avatar} alt={user?.name} />
                        <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <p className="text-sm font-medium leading-none">{user?.name}</p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer" onClick={handleProfileClick}>
                      <User className="mr-2 h-4 w-4" />
                      <span>My Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={handleSettingsClick}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer text-red-600" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant={isHomePage ? "outline" : "secondary"}
                  className={`md:hidden text-base font-semibold flex items-center gap-1 px-4 py-2 ${
                    isHomePage ? "bg-transparent border-white text-white hover:bg-white/20 drop-shadow-md" : ""
                  }`}
                  onClick={handleLogin}
                >
                  <LogIn size={16} />
                  <span>Log In</span>
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
