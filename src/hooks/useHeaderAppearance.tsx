
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function useHeaderAppearance() {
  const location = useLocation();
  const { isAuthenticated, isDevMode } = useAuth();
  
  const isHomePage = location.pathname === "/";
  
  // In dev mode, we always treat as if authenticated to make navigation possible
  const effectivelyAuthenticated = isAuthenticated || isDevMode;
  
  // Show navigation when:
  // 1. Not on homepage OR
  // 2. On homepage but in dev mode
  const showNavigation = !isHomePage || (isHomePage && isDevMode);
  
  return {
    isHomePage,
    isAuthenticated: effectivelyAuthenticated,
    shouldBeTransparent: isHomePage,
    showNavigation
  };
}
