
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Component that scrolls to the top of the page when the route changes
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top immediately on route change
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
