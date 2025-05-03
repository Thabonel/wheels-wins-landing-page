
import { NavLink } from "react-router-dom";

interface NavigationLinksProps {
  isVisible: boolean;
}

const NavigationLinks = ({ isVisible }: NavigationLinksProps) => {
  const navItems = [
    { label: "You", path: "/you" },
    { label: "Wheels", path: "/wheels" },
    { label: "Wins", path: "/wins" },
    { label: "Social", path: "/social" },
    { label: "Shop", path: "/shop" },
  ];

  if (!isVisible) return null;

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
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
};

export default NavigationLinks;
