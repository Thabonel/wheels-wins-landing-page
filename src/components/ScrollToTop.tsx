
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop component that resets scroll position when route changes
 * Placed at the top level of the app to ensure consistent behavior across all pages
 * This is the single source of truth for scroll reset on route changes
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Immediate scroll to top with no animation
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto"
    });
    
    // Also ensure any element with id "content" is scrolled to top
    // This helps with layouts that have separate scrollable areas
    const contentElement = document.getElementById("content");
    if (contentElement) {
      contentElement.scrollTop = 0;
    }
    
    console.log("ScrollToTop: Reset scroll position for route:", pathname);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
