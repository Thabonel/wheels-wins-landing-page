
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const Header = () => {
  const location = useLocation();
  
  const navItems = [
    { id: "you", label: "You", path: "/you" },
    { id: "wheels", label: "Wheels", path: "/wheels" },
    { id: "wins", label: "Wins", path: "/wins" },
    { id: "social", label: "Social", path: "/social" },
    { id: "shop", label: "Shop", path: "/shop" }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 py-4 bg-transparent">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex-shrink-0">
            <NavLink to="/">
              <img
                src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets//wheels%20and%20wins%20Logo%20alpha.png"
                alt="Wheels & Wins Logo"
                className="h-14 object-contain"
              />
            </NavLink>
          </div>

          {/* Navigation */}
          <nav className="flex items-center space-x-8">
            {navItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) => 
                  `text-lg font-semibold transition-colors ${
                    isActive ? "text-blue-600" : "text-gray-500 hover:text-blue-600"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Login */}
          <Button
            variant="secondary"
            className="text-lg font-semibold flex items-center gap-2 px-6 py-5"
          >
            <LogIn size={20} />
            <span>Log In</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
