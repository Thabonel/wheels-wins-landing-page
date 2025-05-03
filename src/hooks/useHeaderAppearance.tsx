
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function useHeaderAppearance() {
  const location = useLocation();
  const { isAuthenticated, isDevMode } = useAuth();
  
  const isHomePage = location.pathname === "/";
  
  // Show navigation when:
  // 1. We're not on the home page OR
  // 2. We're in dev mode (Lovable preview)
  const showNavigation = !isHomePage || isDevMode;
  
  return {
    isHomePage,
    isAuthenticated,
    shouldBeTransparent: isHomePage, // Only transparent on home
    showNavigation
  };
}
