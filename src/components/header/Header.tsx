import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import UserMenu from "./UserMenu";

const Header = () => {
  const { isAuthenticated, isDevMode } = useAuth();
  const effectivelyAuthenticated = isAuthenticated || isDevMode;

  return (
    <header className="bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-primary">
              Wheels & Wins
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {effectivelyAuthenticated && (
              <>
                <Link to="/wheels" className="text-foreground hover:text-primary transition-colors">
                  Wheels
                </Link>
                <Link to="/wins" className="text-foreground hover:text-primary transition-colors">
                  Wins
                </Link>
                <Link to="/marketplace" className="text-foreground hover:text-primary transition-colors">
                  Marketplace
                </Link>
                <Link to="/social" className="text-foreground hover:text-primary transition-colors">
                  Social
                </Link>
              </>
            )}
          </nav>

          {/* User Menu */}
          <div className="flex items-center">
            {effectivelyAuthenticated ? (
              <UserMenu />
            ) : (
              <Link to="/auth" className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;