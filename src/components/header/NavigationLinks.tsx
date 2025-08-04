
import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface NavigationLinksProps {
  isVisible: boolean;
}

const NavigationLinks = ({ isVisible }: NavigationLinksProps) => {
  const { isAuthenticated, isDevMode } = useAuth();
  
  // Only show navigation when authenticated (or in dev mode) AND isVisible is true
  const shouldShowNav = isVisible && (isAuthenticated || isDevMode);
  
  // Define authenticated nav items
  const authenticatedNavItems = [
    { label: "You", path: "/you" },
    { label: "Plan Your Trip", path: "/plan-your-trip" },
    { label: "Wheels", path: "/wheels" },
    { label: "Wins", path: "/wins" },
    { label: "Social", path: "/social" },
    { label: "Shop", path: "/shop" },
  ];

  if (!shouldShowNav) return null;

  return (
    <nav className="flex space-x-6">
      {authenticatedNavItems.map((item) => (
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
