/**
 * PageTransition - Standard slide transition for all pages/views
 * 
 * This component provides the standard slide transition effect:
 * - Enter: opacity: 0, x: -20 → opacity: 1, x: 0
 * - Exit: opacity: 1, x: 0 → opacity: 0, x: 20
 * - Duration: 0.3s for smooth, responsive feel
 */

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

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
}: PageTransitionProps) {
  // Respect user's motion preferences
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  // Skip animation if disabled or user prefers reduced motion
  if (disableTransition || prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const transitionConfig = {
    initial: { opacity: 0, x: -slideDistance },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: slideDistance },
    transition: { duration, ease: 'easeInOut' },
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
        className={className}
        {...transitionConfig}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Hook for page transition with consistent configuration
 */
export function usePageTransition(currentView: string) {
  return {
    key: currentView,
    ...SLIDE_TRANSITION,
    transition: { duration: 0.3, ease: 'easeInOut' },
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
    transition: { duration: 0.3, ease: 'easeInOut' },
  },
  
  /** Fast transition for tabs/quick navigation */
  tab: {
    initial: { opacity: 0, x: -15 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 15 },
    transition: { duration: 0.2, ease: 'easeInOut' },
  },
  
  /** Slow transition for major navigation */
  route: {
    initial: { opacity: 0, x: -30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 30 },
    transition: { duration: 0.4, ease: 'easeInOut' },
  },
  
  /** Subtle transition for content updates */
  content: {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 10 },
    transition: { duration: 0.15, ease: 'easeInOut' },
  },
} as const;

export default PageTransition;