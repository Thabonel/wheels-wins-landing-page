import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useScrollReset = (p0: string[]) => {
  const location = useLocation();

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);
  }, [location.pathname]);
};
