/**
 * RouteTransition - Animated transitions for React Router route changes
 *
 * Wraps route content with the standard slide transition effect
 * Automatically detects route changes via useLocation hook
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, Outlet } from 'react-router-dom';
import { ReactNode } from 'react';
import { PageTransitionVariants } from './PageTransition';

interface RouteTransitionProps {
  /** Route content to animate */
  children?: ReactNode;
  /** Custom transition variant (default: 'route') */
  variant?: keyof typeof PageTransitionVariants;
  /** Additional CSS classes */
  className?: string;
}

export function RouteTransition({
  children,
  variant = 'route',
  className = '',
}: RouteTransitionProps) {
  const location = useLocation();

  // Respect user's motion preferences
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  if (prefersReducedMotion) {
    // Render children directly or use Outlet if no children are passed
    return <div className={className}>{children || <Outlet />}</div>;
  }

  const transitionConfig = PageTransitionVariants[variant];

  return (
    <div style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%" }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          className={className}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={transitionConfig}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          style={{ 
            position: "absolute", 
            top: 0,
            left: 0,
            width: "100%", 
            height: "100%",
            willChange: "transform, opacity"
          }}
        >
          {/* Render children if provided, otherwise use Outlet for route rendering */}
          {children || <Outlet />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/**
 * Higher-order component to wrap any component with route transitions
 */
export function withRouteTransition<P extends object>(
  Component: React.ComponentType<P>,
  variant: keyof typeof PageTransitionVariants = 'route'
) {
  return function WrappedComponent(props: P) {
    return (
      <RouteTransition variant={variant}>
        <Component {...props} />
      </RouteTransition>
    );
  };
}

/**
 * Route wrapper for pages that need transitions
 */
interface AnimatedRouteProps {
  /** Page component to render */
  element: ReactNode;
  /** Custom transition variant */
  variant?: keyof typeof PageTransitionVariants;
  /** Additional CSS classes */
  className?: string;
}

export function AnimatedRoute({
  element,
  variant = 'route',
  className = '',
}: AnimatedRouteProps) {
  return (
    <RouteTransition variant={variant} className={className}>
      {element}
    </RouteTransition>
  );
}

export default RouteTransition;