
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Component that scrolls to the top of the page when the route changes
 * This is critical for proper canvas navigation
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Force immediate scroll to top on all route changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto" // Changed from "smooth" to ensure immediate scroll reset
    });
    
    // Add a small delay scroll to handle any dynamic content that might affect layout
    const timeoutId = setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto"
      });
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
