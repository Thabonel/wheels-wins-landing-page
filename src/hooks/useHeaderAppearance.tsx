
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function useHeaderAppearance() {
  const location = useLocation();
  const { isAuthenticated, isDevMode } = useAuth();
  
  // Explicitly check if we're on homepage
  const isHomePage = location.pathname === "/";
  
  // Always consider authenticated in dev mode for proper navigation
  const effectivelyAuthenticated = isAuthenticated || isDevMode;
  
  // Show navigation ONLY when authenticated AND NOT on homepage
  const showNavigation = !isHomePage && effectivelyAuthenticated;
  
  // Show user menu (avatar) ONLY when authenticated AND NOT on homepage  
  const showUserMenu = !isHomePage && effectivelyAuthenticated;
  
  return {
    isHomePage,
    isAuthenticated: effectivelyAuthenticated,
    shouldBeTransparent: isHomePage,
    showNavigation,
    showUserMenu
  };
}
