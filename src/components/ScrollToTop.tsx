import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const scrollTop = () => window.scrollTo(0, 0);

    scrollTop(); // immediate scroll
    const timeoutId = setTimeout(() => {
      scrollTop(); // delayed scroll
      requestAnimationFrame(scrollTop); // extra frame reset
    }, 50); // reduced to minimize visible jump

    return () => clearTimeout(timeoutId);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
