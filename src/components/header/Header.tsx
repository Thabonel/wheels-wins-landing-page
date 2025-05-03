
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useHeaderAppearance } from "@/hooks/useHeaderAppearance";
import HeaderContainer from "./HeaderContainer";
import NavigationLinks from "./NavigationLinks";
import LoginButton from "./LoginButton";
import UserMenu from "./UserMenu";
import { useEffect, useState } from "react";

const Header = () => {
  const { isAuthenticated } = useAuth();
  const { isHomePage } = useHeaderAppearance();
  const [isScrolled, setIsScrolled] = useState(false);

  // Add scroll event listener to track when page is scrolled
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <HeaderContainer isHomePage={isHomePage} isScrolled={isScrolled}>
      {/* Logo */}
      <Link to="/" className="flex-shrink-0">
        <img
          src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/wheels%20and%20wins%20Logo%20alpha.png"
          alt="Wheels & Wins"
          className="h-14 object-contain drop-shadow-md"
        />
      </Link>

      {/* Navigation */}
      <NavigationLinks isVisible={!isHomePage && isAuthenticated} />

      {/* Auth Buttons */}
      <div className="flex items-center space-x-4">
        {isAuthenticated ? (
          <UserMenu />
        ) : (
          isHomePage && <LoginButton />
        )}
      </div>
    </HeaderContainer>
  );
};

export default Header;
