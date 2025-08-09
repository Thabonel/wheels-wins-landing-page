/**
 * TabTransition - Standard slide transition for tab content
 * 
 * Optimized for tab switching with faster timing and smaller slide distance
 * Works with Radix UI Tabs and custom tab implementations
 */

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode, useState } from 'react';
import { PageTransitionVariants } from './PageTransition';

interface TabTransitionProps {
  /** Current active tab identifier */
  activeTab: string;
  /** Content to animate */
  children: ReactNode;
  /** Tab content identifier (should match activeTab when this content is active) */
  tabId: string;
  /** Custom transition variant (default: 'tab') */
  variant?: keyof typeof PageTransitionVariants;
  /** Additional CSS classes */
  className?: string;
}

export function TabTransition({
  activeTab,
  children,
  tabId,
  variant = 'tab',
  className = '',
}: TabTransitionProps) {
  // Respect user's motion preferences
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  if (prefersReducedMotion) {
    return activeTab === tabId ? <div className={className}>{children}</div> : null;
  }

  const transitionConfig = PageTransitionVariants[variant];

  return (
    <AnimatePresence mode="wait">
      {activeTab === tabId && (
        <motion.div
          key={tabId}
          className={className}
          {...transitionConfig}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Enhanced TabsContent component for Radix UI Tabs
 * Drop-in replacement for standard TabsContent with animations
 */
interface AnimatedTabsContentProps {
  /** Tab value from Radix UI */
  value: string;
  /** Content to animate */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Custom transition variant */
  variant?: keyof typeof PageTransitionVariants;
}

export function AnimatedTabsContent({
  value,
  children,
  className = '',
  variant = 'tab',
}: AnimatedTabsContentProps) {
  // This works with Radix UI Tabs context
  // The tab switching is handled by the parent Tabs component
  
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  if (prefersReducedMotion) {
    return (
      <div className={className} data-state="active" data-orientation="horizontal">
        {children}
      </div>
    );
  }

  const transitionConfig = PageTransitionVariants[variant];

  return (
    <motion.div
      key={value}
      className={className}
      data-state="active"
      data-orientation="horizontal"
      {...transitionConfig}
    >
      {children}
    </motion.div>
  );
}

/**
 * Hook for managing tab transitions with state
 */
export function useTabTransition(defaultTab: string) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  const transitionProps = {
    activeTab,
    setActiveTab,
    getTransitionProps: (tabId: string) => ({
      activeTab,
      tabId,
    }),
  };
  
  return transitionProps;
}

export default TabTransition;