
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useHeaderAppearance() {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Track scroll position to detect when to change header style
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 60) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return {
    isHomePage: location.pathname === "/",
    isScrolled,
  };
}
