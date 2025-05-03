
import { NavLink } from "react-router-dom";

interface NavigationLinksProps {
  navItems: {
    id: string;
    label: string;
    path: string;
  }[];
  isHomePage: boolean;
  closeMobileMenu?: () => void;
  isMobile?: boolean;
}

const NavigationLinks = ({ 
  navItems, 
  isHomePage, 
  closeMobileMenu, 
  isMobile = false 
}: NavigationLinksProps) => {
  
  return (
    <>
      {navItems.map((item) => (
        <NavLink
          key={item.id}
          to={item.path}
          className={({ isActive }) => 
            `${isMobile ? "text-xl" : "text-lg"} font-semibold transition-colors ${
              isActive 
                ? "text-blue-600" 
                : isHomePage && !isMobile
                  ? "text-white hover:text-blue-200 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" 
                  : "text-gray-500 hover:text-blue-600"
            }`
          }
          onClick={closeMobileMenu}
        >
          {item.label}
        </NavLink>
      ))}
    </>
  );
};

export default NavigationLinks;
