
import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "react-router-dom";

interface NavigationLinksProps {
  isVisible: boolean;
}

const NavigationLinks = ({ isVisible }: NavigationLinksProps) => {
  const { isAuthenticated, isDevMode } = useAuth();
  const location = useLocation();
  const isShopPage = location.pathname === '/shop';
  
  // Define authenticated nav items
  const authenticatedNavItems = [
    { label: "You", path: "/you" },
    { label: "Safety", path: "/safety" },
    { label: "Wheels", path: "/wheels" },
    { label: "Wins", path: "/wins" },
    { label: "Social", path: "/social" },
    { label: "Shop", path: "/shop" },
    // Profile is intentionally excluded - only accessible via avatar
  ];
  
  // Define unauthenticated nav items for shop page
  const unauthenticatedShopNavItems = [
    { label: "Shop", path: "/shop" },
  ];
  
  // Determine which nav items to show
  const navItems = (isAuthenticated || isDevMode) 
    ? authenticatedNavItems 
    : (isShopPage ? unauthenticatedShopNavItems : []);

  if (!isVisible || navItems.length === 0) return null;

  return (
    <nav className="flex space-x-6">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `text-lg font-semibold transition-colors ${
              isActive ? "text-blue-600" : "text-gray-500 hover:text-blue-600"
            }`
          }
          end
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
};

export default NavigationLinks;
