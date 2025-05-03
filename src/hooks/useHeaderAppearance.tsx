
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function useHeaderAppearance() {
  const location = useLocation();
  const { isAuthenticated, isDevMode } = useAuth();
  
  const isHomePage = location.pathname === "/";
  
  return {
    isHomePage,
    isAuthenticated,
    shouldBeTransparent: true, // Always true to make header transparent on all pages
    showNavigation: true // Always show navigation links regardless of page or auth status
  };
}
