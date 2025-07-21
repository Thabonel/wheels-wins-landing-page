/**
 * Common components - Site-wide reusable components
 * 
 * Includes animated versions of UI components that provide
 * consistent slide transitions across the application
 */

// Animation components
export * from './PageTransition'
export * from './TabTransition'
export * from './RouteTransition'
export * from './AnimatedDialog'
export * from './AnimatedAlertDialog'

// Re-export for convenience
export { PageTransition } from './PageTransition'
export { TabTransition } from './TabTransition'
export { RouteTransition } from './RouteTransition'

// Animated Dialog exports for easy import
export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogStaggeredContent,
} from './AnimatedDialog'

export {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './AnimatedAlertDialog'