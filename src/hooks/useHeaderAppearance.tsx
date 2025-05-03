
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function useHeaderAppearance() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  
  const isHomePage = location.pathname === "/";
  const showTransparentHeader = isHomePage && !isAuthenticated;
  
  // Track scroll position to detect when to change header style
  useEffect(() => {
    // Define the scroll handler
    const handleScroll = () => {
      if (window.scrollY > 60) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    // Force check initial scroll position on mount
    handleScroll();
    
    // Add the event listener
    window.addEventListener("scroll", handleScroll, { passive: true });
    
    // Cleanup
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return {
    isHomePage,
    isScrolled,
    showTransparentHeader,
    shouldBeTransparent: showTransparentHeader && !isScrolled
  };
}
