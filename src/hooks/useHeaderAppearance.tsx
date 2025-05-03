
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function useHeaderAppearance() {
  const location = useLocation();
  const { isAuthenticated, isDevMode } = useAuth();
  
  // Check if we're on homepage
  const isHomePage = location.pathname === "/";
  
  // Always consider authenticated in dev mode for proper navigation
  const effectivelyAuthenticated = isAuthenticated || isDevMode;
  
  // Show navigation when:
  // 1. Not on homepage (make this explicit)
  // 2. Never show on homepage, even in dev mode to fix the homepage appearance
  const showNavigation = !isHomePage;
  
  // Show user menu (avatar) when:
  // 1. Not on homepage (make this explicit)
  // 2. Never show on homepage, even in dev mode to fix the homepage appearance
  const showUserMenu = !isHomePage;
  
  return {
    isHomePage,
    isAuthenticated: effectivelyAuthenticated,
    shouldBeTransparent: isHomePage,
    showNavigation,
    showUserMenu
  };
}
