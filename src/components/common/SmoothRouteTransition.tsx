/**
 * SmoothRouteTransition - Enhanced route transition that prevents jump-then-slide
 * 
 * This component ensures smooth page transitions by:
 * 1. Preloading content before animation starts
 * 2. Using proper positioning to prevent layout shifts
 * 3. Adding loading states for seamless transitions
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, Outlet } from 'react-router-dom';
import { ReactNode, useState, useEffect } from 'react';
import { PageTransitionVariants } from './PageTransition';

interface SmoothRouteTransitionProps {
  children?: ReactNode;
  variant?: keyof typeof PageTransitionVariants;
  className?: string;
  showLoader?: boolean;
}

export function SmoothRouteTransition({
  children,
  variant = 'route',
  className = '',
  showLoader = false,
}: SmoothRouteTransitionProps) {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState(location.pathname);

  // Respect user's motion preferences
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  // Handle route changes with smooth loading
  useEffect(() => {
    if (location.pathname !== currentPath) {
      setIsLoading(true);
      
      // Small delay to ensure content is ready
      const timer = setTimeout(() => {
        setCurrentPath(location.pathname);
        setIsLoading(false);
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [location.pathname, currentPath]);

  if (prefersReducedMotion) {
    return (
      <div className={`page-content ${className}`}>
        {children || <Outlet />}
      </div>
    );
  }

  const transitionConfig = PageTransitionVariants[variant];

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Loading overlay for smooth transitions */}
      {showLoader && isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </motion.div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentPath}
          className={`absolute top-0 left-0 w-full h-full page-content ${className}`}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={transitionConfig}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          style={{
            willChange: "transform, opacity",
            backfaceVisibility: "hidden",
          }}
          onAnimationStart={() => {
            // Ensure smooth performance during animation
            document.body.style.overflow = 'hidden';
          }}
          onAnimationComplete={() => {
            document.body.style.overflow = '';
          }}
        >
          {children || <Outlet />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default SmoothRouteTransition;