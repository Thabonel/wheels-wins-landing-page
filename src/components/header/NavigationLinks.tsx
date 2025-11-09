
import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { Menu, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTransitionModule } from "@/hooks/useTransitionModule";

interface NavigationLinksProps {
  isVisible: boolean;
}

const NavigationLinks = ({ isVisible }: NavigationLinksProps) => {
  const { isAuthenticated, isDevMode } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { shouldShowInNav: showTransition, daysUntilDeparture } = useTransitionModule();

  // Only show navigation when authenticated (or in dev mode) AND isVisible is true
  const shouldShowNav = isVisible && (isAuthenticated || isDevMode);

  // Define authenticated nav items
  const authenticatedNavItems = [
    { label: "You", path: "/you" },
    { label: "Wheels", path: "/wheels" },
    { label: "Wins", path: "/wins" },
    { label: "Social", path: "/social" },
    { label: "Shop", path: "/shop" },
    // Conditionally add Transition link
    ...(showTransition ? [{ label: "Transition", path: "/transition" }] : []),
  ];

  if (!shouldShowNav) return null;

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleMobileNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex space-x-6">
        {authenticatedNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `text-lg font-semibold transition-colors ${
                isActive ? "text-blue-600" : "text-gray-500 hover:text-blue-600"
              }`
            }
            end
          >
            <span className="flex items-center gap-1.5">
              {item.label}
              {item.label === "Transition" && daysUntilDeparture !== null && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                  <Clock className="h-3 w-3" />
                  {daysUntilDeparture}d
                </span>
              )}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden p-2"
        onClick={handleMobileMenuToggle}
        aria-label="Toggle mobile menu"
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </Button>

      {/* Mobile Navigation Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Overlay background */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={handleMobileMenuToggle}
          />

          {/* Menu panel */}
          <div className="fixed top-0 right-0 bottom-0 w-64 bg-white shadow-xl">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <span className="text-lg font-semibold text-gray-900">Menu</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMobileMenuToggle}
                  className="p-2"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Navigation Links */}
              <nav className="flex-1 px-4 py-6 space-y-1">
                {authenticatedNavItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={handleMobileNavClick}
                    className={({ isActive }) =>
                      `block px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        isActive
                          ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                          : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                      }`
                    }
                    end
                  >
                    <span className="flex items-center justify-between">
                      <span>{item.label}</span>
                      {item.label === "Transition" && daysUntilDeparture !== null && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          <Clock className="h-3 w-3" />
                          {daysUntilDeparture}d
                        </span>
                      )}
                    </span>
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NavigationLinks;
