
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useHeaderAppearance } from "@/hooks/useHeaderAppearance";
import HeaderContainer from "./HeaderContainer";
import NavigationLinks from "./NavigationLinks";
import LoginButton from "./LoginButton";
import UserMenu from "./UserMenu";
import { Button } from "@/components/ui/button";

const Header = () => {
  const { isAuthenticated, isDevMode } = useAuth();
  const { isHomePage, showNavigation, showUserMenu } = useHeaderAppearance();

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

      {/* Navigation - ONLY when not on homepage */}
      {showNavigation && <NavigationLinks isVisible={true} />}

      {/* Auth Buttons */}
      <div className="flex items-center space-x-4">
        {isAuthenticated ? (
          showUserMenu && <UserMenu />
        ) : (
          <>
            {(isHomePage || isDevMode) && <LoginButton />}
            {!isHomePage && !isDevMode && (
              <Link to="/auth">
                <Button variant="default">Sign In</Button>
              </Link>
            )}
          </>
        )}
      </div>
    </HeaderContainer>
  );
};

export default Header;
