
/**
 * AnimatedDialog - Enhanced dialog components with slide transitions
 * 
 * Drop-in replacement for standard Dialog components with consistent
 * site-wide slide animations using Framer Motion
 */

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ANIMATION_VARIANTS, ANIMATION_UTILS } from "@/config/animations"

// Re-export primitives that don't need animation
const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

/**
 * Animated overlay with fade transition
 */
const AnimatedDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const prefersReducedMotion = ANIMATION_UTILS.prefersReducedMotion()
  
  return (
    <DialogPrimitive.Overlay
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
    </DialogPrimitive.Overlay>
  )
})
AnimatedDialogOverlay.displayName = "AnimatedDialogOverlay"

/**
 * Animated dialog content with slide and scale transition
 */
const AnimatedDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const modalVariant = ANIMATION_UTILS.getVariant('modal')
  
  return (
    <DialogPortal>
      <AnimatedDialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        asChild
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg max-w-lg mx-auto",
          className
        )}
        {...props}
      >
        <motion.div
          {...modalVariant}
        >
          {children}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </motion.div>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
AnimatedDialogContent.displayName = "AnimatedDialogContent"

/**
 * Dialog header with optional slide-in animation for content
 */
const AnimatedDialogHeader = React.forwardRef<
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
          "flex flex-col space-y-1.5 text-center sm:text-left",
          className
        )}
        {...contentVariant}
      >
        {children}
      </motion.div>
    )
  }
  
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left",
        className
      )}
      {...htmlProps}
    >
      {children}
    </div>
  )
})
AnimatedDialogHeader.displayName = "AnimatedDialogHeader"

/**
 * Dialog footer with optional slide-in animation
 */
const AnimatedDialogFooter = React.forwardRef<
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
AnimatedDialogFooter.displayName = "AnimatedDialogFooter"

// Re-export title and description as-is (they get animated with the content)
const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

/**
 * Staggered content wrapper for complex dialogs
 * Animates child elements with a slight delay for polished effect
 */
const DialogStaggeredContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    /** Stagger delay between child animations */
    staggerDelay?: number
  }
>(({ className, children, staggerDelay = 0.05, ...htmlProps }, ref) => {
  const prefersReducedMotion = ANIMATION_UTILS.prefersReducedMotion()
  
  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : staggerDelay
      }
    }
  }
  
  const itemVariants = ANIMATION_UTILS.getVariant('content')
  
  return (
    <motion.div
      ref={ref}
      className={className}
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
})
DialogStaggeredContent.displayName = "DialogStaggeredContent"

export {
  Dialog,
  DialogPortal,
  DialogTrigger,
  DialogClose,
  AnimatedDialogOverlay as DialogOverlay,
  AnimatedDialogContent as DialogContent,
  AnimatedDialogHeader as DialogHeader,
  AnimatedDialogFooter as DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogStaggeredContent,
  
  // Original exports for backward compatibility
  AnimatedDialogOverlay,
  AnimatedDialogContent,
  AnimatedDialogHeader,
  AnimatedDialogFooter,
}
