
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const Header = () => {
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 py-4 ${isHomePage ? 'backdrop-blur-sm bg-transparent' : 'bg-secondary/80 backdrop-blur-md border-b'}`}>
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link to="/">
              <img 
                src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets//wheels%20and%20wins%20Logo%20alpha.png" 
                alt="Wheels & Wins Logo" 
                className="h-14 object-contain"
              />
            </Link>
          </div>
          <nav className="flex items-center gap-2 md:gap-4">
            <Link to="/dashboard">
              <Button 
                variant={location.pathname === "/dashboard" ? "secondary" : "ghost"} 
                className={`text-base md:text-lg font-semibold ${location.pathname === "/dashboard" ? "bg-accent hover:bg-accent/90" : ""}`}
              >
                You
              </Button>
            </Link>
            <Link to="/wheels">
              <Button variant="ghost" className="text-base md:text-lg font-semibold">
                Wheels
              </Button>
            </Link>
            <Link to="/wins">
              <Button variant="ghost" className="text-base md:text-lg font-semibold">
                Wins
              </Button>
            </Link>
            <Link to="/social">
              <Button variant="ghost" className="text-base md:text-lg font-semibold">
                Social
              </Button>
            </Link>
            <Link to="/shop">
              <Button variant="ghost" className="text-base md:text-lg font-semibold hidden md:flex">
                Shop
              </Button>
            </Link>
            <Button variant="secondary" className="text-base md:text-lg font-semibold flex items-center gap-2 px-4 md:px-6 py-2 md:py-5 ml-1 md:ml-2">
              <LogIn size={20} />
              <span className="hidden sm:inline">Log In</span>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
