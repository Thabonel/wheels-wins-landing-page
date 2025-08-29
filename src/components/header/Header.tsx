import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useHeaderAppearance } from "@/hooks/useHeaderAppearance";
import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import HeaderContainer from "./HeaderContainer";
import NavigationLinks from "./NavigationLinks";
import LoginButton from "./LoginButton";
import UserMenu from "./UserMenu";
import { Button } from "@/components/ui/button";
import { getPublicAssetUrl } from "@/utils/publicAssets";

const Header = () => {
  const { isAuthenticated, isDevMode } = useAuth();
  const { isHomePage, showNavigation, showUserMenu } = useHeaderAppearance();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <HeaderContainer isHomePage={isHomePage} isScrolled={isScrolled}>
      {/* Logo */}
      <Link to="/" className="flex-shrink-0">
        <img
          src={getPublicAssetUrl('wheels and wins Logo alpha.png')}
          alt="Wheels & Wins - RV Trip Planning and Budget Management App Logo"
          className="h-14 object-contain drop-shadow-md"
        />
      </Link>
      {/* Navigation - Show when authenticated */}
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
        {/* Show user menu when authenticated */}
        {showUserMenu && <UserMenu />}
        
        {/* Show auth link for non-homepage, non-authenticated users */}
        {!isHomePage && !isAuthenticated && !isDevMode && (
          <Link to="/login">
            <Button variant="default">Sign In</Button>
          </Link>
        )}
      </div>
    </HeaderContainer>
  );
};

export default Header;
