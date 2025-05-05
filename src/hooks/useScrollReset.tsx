
import { useEffect, useRef } from "react";

/**
 * Hook to reset scroll position when a dependency (like tab state) changes
 * Works in conjunction with ScrollToTop for consistent behavior
 * 
 * @param dependencies - Array of dependencies that should trigger scroll reset
 * @param offset - Optional scroll offset (default: 0)
 * @param container - Optional container element to scroll (default: window)
 */
export const useScrollReset = (
  dependencies: any[],
  offset = 0,
  container?: React.RefObject<HTMLElement>
) => {
  const isFirstRender = useRef(true);
  
  useEffect(() => {
    // Skip first render to avoid double scrolling with initial route load
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    // If container ref is provided and exists, scroll that element
    if (container && container.current) {
      container.current.scrollTop = offset;
    } else {
      // Otherwise scroll the window
      window.scrollTo({
        top: offset,
        left: 0,
        behavior: "auto"
      });
    }
    
    console.log("useScrollReset: Reset scroll position", { 
      dependencies: dependencies.join(", "),
      offset,
      hasContainer: !!container
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
};
