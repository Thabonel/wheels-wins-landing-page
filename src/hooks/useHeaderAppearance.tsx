
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
  // 2. In dev mode (to ensure preview works properly)
  const showNavigation = !isHomePage || isDevMode;
  
  // Show user menu (avatar) when:
  // 1. Not on homepage OR
  // 2. User is authenticated (even on homepage)
  // But never show on homepage unless in dev mode
  const showUserMenu = !isHomePage || isDevMode;
  
  return {
    isHomePage,
    isAuthenticated: effectivelyAuthenticated,
    shouldBeTransparent: isHomePage,
    showNavigation,
    showUserMenu
  };
}
