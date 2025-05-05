import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to the top minus header offset
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto"
    });

    // Additional scroll to ensure position resets cleanly
    setTimeout(() => {
      window.scrollTo({
        top: 64, // offset for fixed header
        left: 0,
        behavior: "auto"
      });
    }, 50);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
