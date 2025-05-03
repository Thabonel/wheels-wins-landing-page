
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 py-4 backdrop-blur-sm bg-transparent">
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
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" className="text-lg font-semibold">
                Dashboard
              </Button>
            </Link>
            <Button variant="secondary" className="text-lg font-semibold flex items-center gap-2 px-6 py-5">
              <LogIn size={20} />
              <span>Log In</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
