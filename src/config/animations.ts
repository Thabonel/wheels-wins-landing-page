
/**
 * Animation Configuration - Site-wide Animation Standards
 * 
 * Centralized configuration for all animations across the application.
 * Ensures consistent timing, easing, and effects throughout the site.
 */

import { Easing } from 'framer-motion';

export const ANIMATION_CONFIG = {
  /** Standard slide transition effect used site-wide */
  SLIDE_TRANSITION: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  
  /** Animation durations in seconds */
  DURATIONS: {
    /** Quick transitions for UI feedback */
    quick: 0.15,
    /** Fast transitions for tabs and quick navigation */
    fast: 0.2,
    /** Standard transitions for most content */
    standard: 0.3,
    /** Slow transitions for major navigation */
    slow: 0.4,
  },
  
  /** Easing functions for different transition types */
  EASING: {
    /** Smooth ease for most transitions */
    default: [0.4, 0.0, 0.2, 1] as Easing,
    /** Snappy ease for interactive elements */
    snappy: [0.4, 0.0, 0.6, 1] as Easing,
    /** Gentle ease for large content */
    gentle: [0.25, 0.46, 0.45, 0.94] as Easing,
  },
  
  /** Slide distances for different contexts */
  SLIDE_DISTANCES: {
    /** Subtle slide for content updates */
    subtle: 10,
    /** Standard slide for tabs and navigation */
    standard: 20,
    /** Large slide for major transitions */
    large: 30,
  },
} as const;

/**
 * Pre-configured animation variants for different use cases
 */
export const ANIMATION_VARIANTS = {
  /** Page-level transitions (routes, major navigation) */
  page: {
    initial: { opacity: 0, x: -ANIMATION_CONFIG.SLIDE_DISTANCES.large },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: ANIMATION_CONFIG.SLIDE_DISTANCES.large },
    transition: { 
      duration: ANIMATION_CONFIG.DURATIONS.slow, 
      ease: ANIMATION_CONFIG.EASING.default 
    },
  },
  
  /** Tab transitions (fast, responsive) */
  tab: {
    initial: { opacity: 0, x: -ANIMATION_CONFIG.SLIDE_DISTANCES.standard },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: ANIMATION_CONFIG.SLIDE_DISTANCES.standard },
    transition: { 
      duration: ANIMATION_CONFIG.DURATIONS.fast, 
      ease: ANIMATION_CONFIG.EASING.snappy 
    },
  },
  
  /** Route transitions (smooth, noticeable) */
  route: {
    initial: { opacity: 0, x: -ANIMATION_CONFIG.SLIDE_DISTANCES.large },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: ANIMATION_CONFIG.SLIDE_DISTANCES.large },
    transition: { 
      duration: ANIMATION_CONFIG.DURATIONS.slow, 
      ease: ANIMATION_CONFIG.EASING.default 
    },
  },
  
  /** Content updates (subtle, quick) */
  content: {
    initial: { opacity: 0, x: -ANIMATION_CONFIG.SLIDE_DISTANCES.subtle },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: ANIMATION_CONFIG.SLIDE_DISTANCES.subtle },
    transition: { 
      duration: ANIMATION_CONFIG.DURATIONS.quick, 
      ease: ANIMATION_CONFIG.EASING.default 
    },
  },
  
  /** Modal/dialog appearances */
  modal: {
    initial: { opacity: 0, scale: 0.95, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 10 },
    transition: { 
      duration: ANIMATION_CONFIG.DURATIONS.standard, 
      ease: ANIMATION_CONFIG.EASING.snappy 
    },
  },
  
  /** Card/component hover effects */
  hover: {
    whileHover: { scale: 1.02 },
    transition: { 
      duration: ANIMATION_CONFIG.DURATIONS.quick, 
      ease: ANIMATION_CONFIG.EASING.snappy 
    },
  },
  
  /** Loading/skeleton animations */
  loading: {
    initial: { opacity: 0.3 },
    animate: { opacity: 1 },
    transition: { 
      duration: 1, 
      repeat: Infinity, 
      repeatType: 'reverse' as const 
    },
  },
} as const;

/**
 * Animation utilities and helpers
 */
export const ANIMATION_UTILS = {
  /** Check if user prefers reduced motion */
  prefersReducedMotion: () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
  
  /** Get animation config with reduced motion consideration */
  getVariant: (variantName: keyof typeof ANIMATION_VARIANTS) => {
    if (ANIMATION_UTILS.prefersReducedMotion()) {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0 },
      };
    }
    return ANIMATION_VARIANTS[variantName];
  },
  
  /** Create custom transition with standard timing */
  createTransition: (duration: keyof typeof ANIMATION_CONFIG.DURATIONS = 'standard') => ({
    duration: ANIMATION_CONFIG.DURATIONS[duration],
    ease: ANIMATION_CONFIG.EASING.default,
  }),
} as const;

/**
 * AnimatePresence configuration presets
 */
export const ANIMATE_PRESENCE_CONFIG = {
  /** Default configuration for most use cases */
  default: {
    mode: 'wait' as const,
    initial: false,
  },
  
  /** For overlapping animations */
  overlap: {
    mode: 'sync' as const,
    initial: false,
  },
  
  /** For immediate animations without exit */
  immediate: {
    mode: 'popLayout' as const,
    initial: true,
  },
} as const;

/**
 * Scroll-triggered animation variants
 * Used with ScrollReveal components for on-scroll reveals
 */
export const SCROLL_VARIANTS = {
  /** Fade up - most common, elegant entrance */
  fadeUp: {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  },
  /** Fade in - subtle, no movement */
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  /** Scale up - for images and cards */
  scaleUp: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  },
  /** Slide from left */
  slideLeft: {
    hidden: { opacity: 0, x: -60 },
    visible: { opacity: 1, x: 0 },
  },
  /** Slide from right */
  slideRight: {
    hidden: { opacity: 0, x: 60 },
    visible: { opacity: 1, x: 0 },
  },
} as const;

/**
 * Stagger timing presets
 */
export const STAGGER_PRESETS = {
  /** Fast stagger for many items */
  fast: { staggerChildren: 0.05, delayChildren: 0.1 },
  /** Standard stagger for cards/features */
  standard: { staggerChildren: 0.1, delayChildren: 0.15 },
  /** Slow stagger for emphasis */
  slow: { staggerChildren: 0.15, delayChildren: 0.2 },
} as const;

export default ANIMATION_CONFIG;
