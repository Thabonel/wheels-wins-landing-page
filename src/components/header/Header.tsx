
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useHeaderAppearance } from "@/hooks/useHeaderAppearance";
import { useLocation } from "react-router-dom";
import HeaderContainer from "./HeaderContainer";
import NavigationLinks from "./NavigationLinks";
import LoginButton from "./LoginButton";
import UserMenu from "./UserMenu";
import { Button } from "@/components/ui/button";

const Header = () => {
  const { isAuthenticated, isDevMode } = useAuth();
  const { isHomePage, showNavigation, showUserMenu } = useHeaderAppearance();
  const location = useLocation();

  return (
    <HeaderContainer isHomePage={isHomePage} isScrolled={false}>
      {/* Logo */}
      <Link to="/" className="flex-shrink-0">
        <img
          src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/wheels%20and%20wins%20Logo%20alpha.png"
          alt="Wheels & Wins"
          className="h-14 object-contain drop-shadow-md"
        />
      </Link>

      {/* Navigation - Only show when authenticated and not on homepage */}
      <NavigationLinks isVisible={showNavigation} />

      {/* Auth Buttons */}
      <div className="flex items-center space-x-4">
        {/* Show Shop and Login buttons on homepage when not authenticated */}
        {isHomePage && !isAuthenticated && !isDevMode && (
          <>
            <Link to="/shop">
              <Button variant="outline" className="bg-white text-primary border-primary hover:bg-primary/10">
                Shop
              </Button>
            </Link>
            <LoginButton />
          </>
        )}

        {/* Show user menu when authenticated and not on homepage */}
        {showUserMenu && <UserMenu />}
        
        {/* Show auth link for non-homepage, non-authenticated users */}
        {!isHomePage && !isAuthenticated && !isDevMode && (
          <Link to="/auth">
            <Button variant="default">Sign In</Button>
          </Link>
        )}
      </div>
    </HeaderContainer>
  );
};

export default Header;
