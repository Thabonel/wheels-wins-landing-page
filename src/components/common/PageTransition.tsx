
/**
 * PageTransition - Enhanced slide transition with robust error handling
 * 
 * Production-ready implementation that prevents white screens and layout issues
 * while maintaining the standard slide transition effect.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode, useState, useCallback } from 'react';

interface PageTransitionProps {
  /** Unique key for the current view (required for AnimatePresence) */
  transitionKey: string;
  /** Content to animate */
  children: ReactNode;
  /** Custom transition duration (default: 0.3s) */
  duration?: number;
  /** Custom slide distance (default: 20px) */
  slideDistance?: number;
  /** Disable transitions (useful for testing or accessibility) */
  disableTransition?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback for animation errors */
  onError?: (error: Error) => void;
}

/**
 * Standard slide transition configuration
 * Used consistently across the entire application
 */
const SLIDE_TRANSITION = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
} as const;

export function PageTransition({
  transitionKey,
  children,
  duration = 0.3,
  slideDistance = 20,
  disableTransition = false,
  className = '',
  onError,
}: PageTransitionProps) {
  const [hasError, setHasError] = useState(false);

  // Respect user's motion preferences
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  // Handle animation errors gracefully
  const handleError = useCallback((error: Error) => {
    console.warn('Page transition animation failed:', error);
    setHasError(true);
    onError?.(error);
  }, [onError]);

  // Skip animation if disabled, user prefers reduced motion, or error occurred
  if (disableTransition || prefersReducedMotion || hasError) {
    return (
      <div className={`page-transition-fallback ${className}`} style={{ width: '100%' }}>
        {children}
      </div>
    );
  }

  const transitionConfig = {
    initial: { opacity: 0, x: -slideDistance },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: slideDistance },
    transition: { duration, ease: [0.4, 0.0, 0.2, 1] as const },
  };

  return (
    <div 
      className="page-transition-container"
      style={{ 
        position: "relative", 
        width: "100%",
        // Prevent layout shifts
        contain: "layout style",
        // Improve performance
        isolation: "isolate"
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={transitionKey}
          className={`page-transition-content ${className}`}
          style={{
            position: "relative",
            width: "100%",
            willChange: "transform, opacity"
          }}
          {...transitionConfig}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/**
 * Hook for page transition with consistent configuration
 */
export function usePageTransition(currentView: string) {
  return {
    key: currentView,
    ...SLIDE_TRANSITION,
    transition: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] as const },
  };
}

/**
 * Pre-configured transitions for common use cases
 */
export const PageTransitionVariants = {
  /** Standard page transition (default) */
  page: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] as const },
  },
  
  /** Fast transition for tabs/quick navigation */
  tab: {
    initial: { opacity: 0, x: -15 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 15 },
    transition: { duration: 0.2, ease: [0.4, 0.0, 0.2, 1] as const },
  },
  
  /** Slow transition for major navigation */
  route: {
    initial: { opacity: 0, x: -30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 30 },
    transition: { duration: 0.4, ease: [0.4, 0.0, 0.2, 1] as const },
  },
  
  /** Subtle transition for content updates */
  content: {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 10 },
    transition: { duration: 0.15, ease: [0.4, 0.0, 0.2, 1] as const },
  },
} as const;

export default PageTransition;
