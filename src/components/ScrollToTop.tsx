
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
      behavior: "auto" // Using "auto" for immediate scroll reset without animation
    });
    
    // Add a small delay scroll to handle any dynamic content that might affect layout
    // This ensures content is fully loaded and positioned before final scroll adjustment
    const timeoutId = setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto"
      });
    }, 100);
    
    // For the Wheels page, add an additional delayed scroll to ensure content is fully rendered
    if (pathname === "/wheels") {
      const additionalTimeoutId = setTimeout(() => {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: "auto"
        });
      }, 250);
      
      return () => {
        clearTimeout(timeoutId);
        clearTimeout(additionalTimeoutId);
      };
    }
    
    return () => clearTimeout(timeoutId);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
