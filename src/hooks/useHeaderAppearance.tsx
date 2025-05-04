
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function useHeaderAppearance() {
  const location = useLocation();
  const { isAuthenticated, isDevMode } = useAuth();
  
  // Explicitly check if we're on homepage
  const isHomePage = location.pathname === "/";
  
  // Always consider authenticated in dev mode for proper navigation
  const effectivelyAuthenticated = isAuthenticated || isDevMode;
  
  // Show navigation ONLY when NOT on homepage
  // This is critical for fixing the canvas navigation
  const showNavigation = !isHomePage;
  
  // Show user menu (avatar) ONLY when NOT on homepage
  // This is critical for fixing the canvas navigation
  const showUserMenu = !isHomePage;
  
  return {
    isHomePage,
    isAuthenticated: effectivelyAuthenticated,
    shouldBeTransparent: isHomePage,
    showNavigation,
    showUserMenu
  };
}
