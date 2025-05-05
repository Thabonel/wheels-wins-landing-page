import { useEffect, useRef } from "react";

/**
 * Hook to reset scroll position when a dependency (like tab state) changes
 * @param dependencies - Array of dependencies that should trigger scroll reset
 * @param offset - Optional scroll offset (default: 0)
 * @param container - Optional container element to scroll (default: window)
 */
export const useScrollReset = (
  dependencies: any[],
  offset = 0,
  container?: React.RefObject<HTMLElement>
) => {
  useEffect(() => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
};
