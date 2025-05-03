
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogIn, Menu, X } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

const Header = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  
  const navItems = [
    { id: "you", label: "You", path: "/you" },
    { id: "wheels", label: "Wheels", path: "/wheels" },
    { id: "wins", label: "Wins", path: "/wins" },
    { id: "social", label: "Social", path: "/social" },
    { id: "shop", label: "Shop", path: "/shop" }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 py-4 bg-white/80 backdrop-blur-sm shadow-sm">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo - fixed width */}
          <div className="flex-shrink-0 w-[180px]">
            <NavLink to="/">
              <img
                src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/wheels%20and%20wins%20Logo%20alpha.png"
                alt="Wheels & Wins Logo"
                className="h-14 object-contain"
              />
            </NavLink>
          </div>

          {/* Mobile Navigation */}
          {isMobile ? (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
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
                        isActive ? "text-blue-600" : "text-gray-500 hover:text-blue-600"
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
                  variant="secondary"
                  className="text-lg font-semibold flex items-center gap-2 px-6 py-5"
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
              variant="secondary"
              className="md:hidden text-base font-semibold flex items-center gap-1 px-4 py-2"
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
