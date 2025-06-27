
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function useHeaderAppearance() {
  const location = useLocation();
  const { isAuthenticated, isDevMode } = useAuth();
  
  // Explicitly check if we're on homepage
  const isHomePage = location.pathname === "/";
  
  // Always consider authenticated in dev mode for proper navigation
  const effectivelyAuthenticated = isAuthenticated || isDevMode;
  
  // Show navigation when authenticated (even on homepage)
  const showNavigation = effectivelyAuthenticated;
  
  // Show user menu (avatar) when authenticated (even on homepage)
  const showUserMenu = effectivelyAuthenticated;
  
  return {
    isHomePage,
    isAuthenticated: effectivelyAuthenticated,
    shouldBeTransparent: isHomePage && !effectivelyAuthenticated,
    showNavigation,
    showUserMenu
  };
}
