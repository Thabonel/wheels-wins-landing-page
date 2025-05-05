
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop component that resets scroll position when route changes
 * Placed at the top level of the app to ensure consistent behavior
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
  }, [pathname]);

  return null;
};

export default ScrollToTop;
