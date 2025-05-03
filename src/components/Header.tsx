
import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/AuthContext";

// Import refactored components
import HeaderContainer from "./header/HeaderContainer";
import NavigationLinks from "./header/NavigationLinks";
import LoginButton from "./header/LoginButton";
import UserMenu from "./header/UserMenu";
import MobileMenu from "./header/MobileMenu";

// Define navigation items for the entire app
export const navItems = [
  { id: "home", label: "Home", path: "/" },
  { id: "dashboard", label: "Dashboard", path: "/dashboard" },
  { id: "you", label: "You", path: "/you" },
  { id: "wheels", label: "Wheels", path: "/wheels" },
  { id: "wins", label: "Wins", path: "/wins" },
  { id: "social", label: "Social", path: "/social" },
  { id: "shop", label: "Shop", path: "/shop" }
];

const Header = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isScrolled, setIsScrolled] = useState(false);
  const { isAuthenticated } = useAuth();
  
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

  const isHomePage = location.pathname === "/";

  return (
    <HeaderContainer isScrolled={isScrolled} isHomePage={isHomePage}>
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
        <MobileMenu navItems={navItems} isHomePage={isHomePage} />
      ) : (
        <>
          {/* Desktop Navigation - centered with flex-grow */}
          <nav className="hidden md:flex items-center justify-center space-x-8 flex-grow">
            <NavigationLinks navItems={navItems} isHomePage={isHomePage} />
          </nav>

          {/* Auth Section - fixed width for balance */}
          <div className="hidden md:block w-[180px] text-right">
            {isAuthenticated ? (
              <UserMenu isHomePage={isHomePage} />
            ) : (
              <LoginButton isHomePage={isHomePage} />
            )}
          </div>
        </>
      )}

      {/* Mobile-only login button or avatar (when menu is closed) */}
      {isMobile && (
        <div className="md:hidden">
          {isAuthenticated ? (
            <UserMenu isHomePage={isHomePage} isMobile={true} />
          ) : (
            <LoginButton isHomePage={isHomePage} isMobile={true} />
          )}
        </div>
      )}
    </HeaderContainer>
  );
};

export default Header;
