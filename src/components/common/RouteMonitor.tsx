import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function RouteMonitor() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const previousPathRef = useRef<string>('');
  const routeChangeCountRef = useRef<number>(0);
  const lastChangeTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = previousPathRef.current;
    const timeSinceLastChange = Date.now() - lastChangeTimeRef.current;
    
    // Increment route change counter
    routeChangeCountRef.current++;
    
    console.log('[RouteMonitor] Route change detected:', {
      from: previousPath || 'initial',
      to: currentPath,
      isAuthenticated,
      userEmail: user?.email,
      changeCount: routeChangeCountRef.current,
      timeSinceLastChange: `${timeSinceLastChange}ms`,
      timestamp: new Date().toISOString()
    });

    // Detect rapid redirects (potential bug)
    if (timeSinceLastChange < 1000 && previousPath && previousPath !== currentPath) {
      console.warn('[RouteMonitor] ⚠️ Rapid redirect detected:', {
        from: previousPath,
        to: currentPath,
        timeElapsed: `${timeSinceLastChange}ms`,
        possibleLoop: previousPath === '/wheels' && currentPath === '/you'
      });
    }

    // Track specific problematic patterns
    if (previousPath === '/wheels' && currentPath === '/you') {
      console.error('[RouteMonitor] 🚨 Detected redirect from /wheels to /you!', {
        isAuthenticated,
        userEmail: user?.email,
        timeSinceLastChange: `${timeSinceLastChange}ms`
      });
    }

    // Update refs for next change
    previousPathRef.current = currentPath;
    lastChangeTimeRef.current = Date.now();
  }, [location.pathname, isAuthenticated, user]);

  return null;
}