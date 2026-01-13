import { ReactNode, useRef } from 'react';
import { motion, useInView, Variants, HTMLMotionProps } from 'framer-motion';

// Animation variants for different reveal styles
export const scrollRevealVariants = {
  // Fade up - most common, elegant entrance
  fadeUp: {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  },
  // Fade in - subtle, no movement
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  // Scale up - for images and cards
  scaleUp: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  },
  // Slide from left
  slideLeft: {
    hidden: { opacity: 0, x: -60 },
    visible: { opacity: 1, x: 0 },
  },
  // Slide from right
  slideRight: {
    hidden: { opacity: 0, x: 60 },
    visible: { opacity: 1, x: 0 },
  },
} as const;

// Stagger container for child animations
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

// Stagger item for use inside stagger container
export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

interface ScrollRevealProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  children: ReactNode;
  variant?: keyof typeof scrollRevealVariants;
  delay?: number;
  duration?: number;
  once?: boolean;
  amount?: number | 'some' | 'all';
  className?: string;
  as?: 'div' | 'section' | 'article' | 'aside' | 'header' | 'footer';
}

/**
 * ScrollReveal - Wrapper component for scroll-triggered animations
 *
 * Usage:
 * <ScrollReveal variant="fadeUp">
 *   <YourContent />
 * </ScrollReveal>
 *
 * For staggered children:
 * <ScrollReveal variant="fadeUp" stagger>
 *   <StaggerItem>Item 1</StaggerItem>
 *   <StaggerItem>Item 2</StaggerItem>
 * </ScrollReveal>
 */
export function ScrollReveal({
  children,
  variant = 'fadeUp',
  delay = 0,
  duration = 0.6,
  once = true,
  amount = 0.2,
  className = '',
  as = 'div',
  ...props
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount });

  const selectedVariant = scrollRevealVariants[variant];

  const MotionComponent = motion[as] as typeof motion.div;

  return (
    <MotionComponent
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: selectedVariant.hidden,
        visible: {
          ...selectedVariant.visible,
          transition: {
            duration,
            delay,
            ease: [0.25, 0.46, 0.45, 0.94] as const,
          },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </MotionComponent>
  );
}

interface StaggerContainerProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  children: ReactNode;
  staggerDelay?: number;
  initialDelay?: number;
  once?: boolean;
  amount?: number | 'some' | 'all';
  className?: string;
  as?: 'div' | 'section' | 'ul' | 'ol';
}

/**
 * StaggerContainer - Container for staggered child animations
 *
 * Usage:
 * <StaggerContainer>
 *   <StaggerItem>Item 1</StaggerItem>
 *   <StaggerItem>Item 2</StaggerItem>
 *   <StaggerItem>Item 3</StaggerItem>
 * </StaggerContainer>
 */
export function StaggerContainer({
  children,
  staggerDelay = 0.1,
  initialDelay = 0.1,
  once = true,
  amount = 0.2,
  className = '',
  as = 'div',
  ...props
}: StaggerContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount });

  const MotionComponent = motion[as] as typeof motion.div;

  return (
    <MotionComponent
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: initialDelay,
          },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </MotionComponent>
  );
}

interface StaggerItemProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  children: ReactNode;
  variant?: keyof typeof scrollRevealVariants;
  duration?: number;
  className?: string;
  as?: 'div' | 'li' | 'article' | 'span';
}

/**
 * StaggerItem - Individual item inside a StaggerContainer
 */
export function StaggerItem({
  children,
  variant = 'fadeUp',
  duration = 0.5,
  className = '',
  as = 'div',
  ...props
}: StaggerItemProps) {
  const selectedVariant = scrollRevealVariants[variant];

  const MotionComponent = motion[as] as typeof motion.div;

  return (
    <MotionComponent
      variants={{
        hidden: selectedVariant.hidden,
        visible: {
          ...selectedVariant.visible,
          transition: {
            duration,
            ease: [0.25, 0.46, 0.45, 0.94],
          },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </MotionComponent>
  );
}

/**
 * Hook for custom scroll-triggered animations
 * Returns isInView boolean for manual control
 */
export function useScrollReveal(options: { once?: boolean; amount?: number | 'some' | 'all' } = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: options.once ?? true, amount: options.amount ?? 0.2 });
  return { ref, isInView };
}

export default ScrollReveal;
