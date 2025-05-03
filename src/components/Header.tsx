import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { NavLink } from "react-router-dom";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 py-4 bg-white shadow-sm">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <img
              src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets//wheels%20and%20wins%20Logo%20alpha.png"
              alt="Wheels & Wins Logo"
              className="h-14 object-contain"
            />
            {/* Nav Links */}
            <nav className="flex gap-6 text-md font-semibold">
              <NavLink to="/you" className="hover:text-blue-600">You</NavLink>
              <NavLink to="/wheels" className="hover:text-blue-600">Wheels</NavLink>
              <NavLink to="/wins" className="hover:text-blue-600">Wins</NavLink>
              <NavLink to="/social" className="hover:text-blue-600">Social</NavLink>
              <NavLink to="/shop" className="hover:text-blue-600">Shop</NavLink>
            </nav>
          </div>

          {/* Login */}
          <div>
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
