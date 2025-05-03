
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useHeaderAppearance() {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const isHomePage = location.pathname === "/";
  
  // Track scroll position to detect when to change header style
  useEffect(() => {
    // Force check initial scroll position on mount
    handleScroll();
    
    function handleScroll() {
      if (window.scrollY > 60) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    }

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return {
    isHomePage,
    isScrolled,
    shouldBeTransparent: isHomePage && !isScrolled
  };
}
