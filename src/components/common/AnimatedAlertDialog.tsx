
/**
 * AnimatedAlertDialog - Enhanced alert dialog components with slide transitions
 * 
 * Drop-in replacement for standard AlertDialog components with consistent
 * site-wide slide animations using Framer Motion
 */

import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { ANIMATION_VARIANTS, ANIMATION_UTILS } from "@/config/animations"

// Re-export primitives that don't need animation
const AlertDialog = AlertDialogPrimitive.Root
const AlertDialogTrigger = AlertDialogPrimitive.Trigger
const AlertDialogPortal = AlertDialogPrimitive.Portal

/**
 * Animated alert dialog overlay with fade transition
 */
const AnimatedAlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const prefersReducedMotion = ANIMATION_UTILS.prefersReducedMotion()
  
  return (
    <AlertDialogPrimitive.Overlay
      ref={ref}
      asChild
      className={cn("fixed inset-0 z-50 bg-black/80", className)}
      {...props}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ 
          duration: prefersReducedMotion ? 0 : 0.2,
          ease: [0.4, 0.0, 0.2, 1]
        }}
      />
    </AlertDialogPrimitive.Overlay>
  )
})
AnimatedAlertDialogOverlay.displayName = "AnimatedAlertDialogOverlay"

/**
 * Animated alert dialog content with slide and scale transition
 * Uses a slightly more pronounced animation for important alerts
 */
const AnimatedAlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => {
  const prefersReducedMotion = ANIMATION_UTILS.prefersReducedMotion()
  
  // Alert dialogs get slightly more pronounced animation to draw attention
  const alertVariant = prefersReducedMotion 
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, scale: 0.9, y: 20 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.9, y: 20 },
        transition: { duration: 0.25, ease: [0.4, 0.0, 0.6, 1] }
      }
  
  return (
    <AlertDialogPortal>
      <AnimatedAlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        asChild
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",
          className
        )}
        {...props}
      >
        <motion.div {...alertVariant} />
      </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
  )
})
AnimatedAlertDialogContent.displayName = "AnimatedAlertDialogContent"

/**
 * Alert dialog header with optional slide-in animation
 */
const AnimatedAlertDialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    /** Enable subtle slide animation for header content */
    animated?: boolean
  }
>(({ className, animated = false, children, ...htmlProps }, ref) => {
  const contentVariant = ANIMATION_UTILS.getVariant('content')
  
  if (animated) {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "flex flex-col space-y-2 text-center sm:text-left",
          className
        )}
        {...contentVariant}
        {...htmlProps}
      >
        {children}
      </motion.div>
    )
  }
  
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-2 text-center sm:text-left",
        className
      )}
      {...htmlProps}
    >
      {children}
    </div>
  )
})
AnimatedAlertDialogHeader.displayName = "AnimatedAlertDialogHeader"

/**
 * Alert dialog footer with optional slide-in animation
 */
const AnimatedAlertDialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    /** Enable subtle slide animation for footer content */
    animated?: boolean
  }
>(({ className, animated = false, children, ...htmlProps }, ref) => {
  const contentVariant = ANIMATION_UTILS.getVariant('content')
  
  if (animated) {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
          className
        )}
        {...contentVariant}
        transition={{ ...contentVariant.transition, delay: 0.1 }}
        {...htmlProps}
      >
        {children}
      </motion.div>
    )
  }
  
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className
      )}
      {...htmlProps}
    >
      {children}
    </div>
  )
})
AnimatedAlertDialogFooter.displayName = "AnimatedAlertDialogFooter"

// Re-export title and description as-is (they get animated with the content)
const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
))
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName

// Animated action buttons with subtle hover effects
const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    asChild
    className={cn(buttonVariants(), className)}
    {...props}
  >
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
    />
  </AlertDialogPrimitive.Action>
))
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    asChild
    className={cn(
      buttonVariants({ variant: "outline" }),
      "mt-2 sm:mt-0",
      className
    )}
    {...props}
  >
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
    />
  </AlertDialogPrimitive.Cancel>
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogTrigger,
  AnimatedAlertDialogOverlay as AlertDialogOverlay,
  AnimatedAlertDialogContent as AlertDialogContent,
  AnimatedAlertDialogHeader as AlertDialogHeader,
  AnimatedAlertDialogFooter as AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  
  // Original exports for backward compatibility
  AnimatedAlertDialogOverlay,
  AnimatedAlertDialogContent,
  AnimatedAlertDialogHeader,
  AnimatedAlertDialogFooter,
}
