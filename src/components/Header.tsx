
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/AuthContext";
import { useHeaderAppearance } from "@/hooks/useHeaderAppearance";

// Import refactored components
import HeaderContainer from "./header/HeaderContainer";
import NavigationLinks from "./header/NavigationLinks";
import UserMenu from "./header/UserMenu";
import MobileMenu from "./header/MobileMenu";
import LogoutButton from "./header/LogoutButton";

// Define navigation items for the entire app
export const navItems = [
  { id: "you", label: "You", path: "/you" },
  { id: "wheels", label: "Wheels", path: "/wheels" },
  { id: "wins", label: "Wins", path: "/wins" },
  { id: "social", label: "Social", path: "/social" },
  { id: "shop", label: "Shop", path: "/shop" }
];

const Header = () => {
  const isMobile = useIsMobile();
  const { isAuthenticated } = useAuth();
  const { isHomePage, isScrolled } = useHeaderAppearance();

  return (
    <HeaderContainer isScrolled={isScrolled} isHomePage={isHomePage}>
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
        <MobileMenu navItems={navItems} isHomePage={isHomePage} />
      ) : (
        <>
          {/* Desktop Navigation Links - Only show on non-home pages when authenticated */}
          {!isHomePage && isAuthenticated && (
            <nav className="hidden md:flex items-center justify-center space-x-8 flex-grow">
              <NavigationLinks navItems={navItems} isHomePage={isHomePage} />
            </nav>
          )}

          {/* Auth Section - fixed width for balance */}
          <div className="hidden md:flex items-center justify-end w-[180px]">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <UserMenu isHomePage={isHomePage} />
                <LogoutButton isHomePage={isHomePage} />
              </div>
            ) : (
              /* Only show login button */
              <UserMenu isHomePage={isHomePage} />
            )}
          </div>
        </>
      )}

      {/* Mobile-only user menu */}
      {isMobile && (
        <div className="md:hidden">
          <UserMenu isHomePage={isHomePage} isMobile={true} />
        </div>
      )}
    </HeaderContainer>
  );
};

export default Header;
