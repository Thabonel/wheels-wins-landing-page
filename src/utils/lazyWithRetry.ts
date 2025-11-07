/**
 * Lazy load with automatic retry on chunk load errors
 *
 * Fixes the "Failed to fetch dynamically imported module" error that occurs when:
 * - User has old page cached
 * - New deployment creates new hashed filenames
 * - Browser tries to load old chunk that no longer exists
 *
 * Solution: Automatically reload the page once to get fresh HTML with correct chunk references
 */

const RETRY_KEY = 'chunk_load_retry';
const MAX_RETRIES = 1;

export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      // Try to load the component
      return await componentImport();
    } catch (error) {
      // Check if this is a chunk load error
      const isChunkLoadError =
        error instanceof Error &&
        (error.message.includes('Failed to fetch dynamically imported module') ||
         error.message.includes('Importing a module script failed') ||
         error.message.includes('ChunkLoadError'));

      if (isChunkLoadError) {
        const retryCount = parseInt(sessionStorage.getItem(RETRY_KEY) || '0', 10);

        if (retryCount < MAX_RETRIES) {
          // Increment retry counter
          sessionStorage.setItem(RETRY_KEY, String(retryCount + 1));

          console.log(`🔄 Chunk load error detected. Reloading page (attempt ${retryCount + 1}/${MAX_RETRIES})...`);

          // Reload the page to get fresh HTML with correct chunk references
          window.location.reload();

          // Return a never-resolving promise to prevent React from rendering during reload
          return new Promise(() => {});
        } else {
          // Max retries reached, clear counter and throw error
          sessionStorage.removeItem(RETRY_KEY);
          console.error('❌ Max chunk load retries reached. Deployment may have issues.');
        }
      }

      // Re-throw error if not a chunk load error or max retries reached
      throw error;
    }
  });
}

// Clear retry counter on successful page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    // Only clear if we haven't just reloaded (wait 100ms to let retry happen if needed)
    setTimeout(() => {
      const retryCount = parseInt(sessionStorage.getItem(RETRY_KEY) || '0', 10);
      if (retryCount > 0) {
        console.log('✅ Page loaded successfully after retry. Clearing retry counter.');
      }
      sessionStorage.removeItem(RETRY_KEY);
    }, 100);
  });
}

export default lazyWithRetry;
