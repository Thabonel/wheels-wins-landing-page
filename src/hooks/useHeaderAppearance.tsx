
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function useHeaderAppearance() {
  const location = useLocation();
  const { isAuthenticated, isDevMode } = useAuth();
  
  const isHomePage = location.pathname === "/";
  
  // Always consider authenticated in dev mode for proper navigation
  const effectivelyAuthenticated = isAuthenticated || isDevMode;
  
  // Show navigation when:
  // 1. Not on homepage OR
  // 2. On homepage but in dev mode (to ensure preview works)
  const showNavigation = !isHomePage || isDevMode;
  
  return {
    isHomePage,
    isAuthenticated: effectivelyAuthenticated,
    shouldBeTransparent: isHomePage,
    showNavigation
  };
}
