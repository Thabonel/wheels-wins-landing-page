
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogIn, Menu } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

const Header = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
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
                  
                  <Button
                    variant="secondary"
                    className="text-lg font-semibold flex items-center gap-2 px-6 py-5 mt-4 w-full justify-center"
                    onClick={() => setIsOpen(false)}
                  >
                    <LogIn size={20} />
                    <span>Log In</span>
                  </Button>
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

              {/* Login Button - fixed width for balance */}
              <div className="hidden md:block w-[180px] text-right">
                <Button
                  variant={isHomePage ? "outline" : "secondary"}
                  className={`text-lg font-semibold flex items-center gap-2 px-6 py-5 ${
                    isHomePage ? "bg-transparent border-white text-white hover:bg-white/20 drop-shadow-md" : ""
                  }`}
                >
                  <LogIn size={20} />
                  <span>Log In</span>
                </Button>
              </div>
            </>
          )}

          {/* Mobile-only login button (when menu is closed) */}
          {isMobile && !isOpen && (
            <Button
              variant={isHomePage ? "outline" : "secondary"}
              className={`md:hidden text-base font-semibold flex items-center gap-1 px-4 py-2 ${
                isHomePage ? "bg-transparent border-white text-white hover:bg-white/20 drop-shadow-md" : ""
              }`}
            >
              <LogIn size={16} />
              <span>Log In</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
