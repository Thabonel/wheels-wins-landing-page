/**
 * Frontend Component Usage Tracking
 *
 * Tracks which React components are actually rendered in production.
 * Used to safely identify truly unused components before deletion.
 *
 * Part of: ENTERPRISE_DEAD_CODE_REMOVAL_PLAN.md
 * Timeline: 2-week monitoring (October 8-22, 2025)
 *
 * Usage:
 * ```tsx
 * import { trackComponentUsage } from '@/utils/usageTracking';
 *
 * export function MyComponent() {
 *   useEffect(() => {
 *     trackComponentUsage('MyComponent');
 *   }, []);
 *   // ...
 * }
 * ```
 */

// Only track in production to avoid polluting development data
const ENABLED = import.meta.env.PROD;

/**
 * Track that a component was rendered in production
 */
export function trackComponentUsage(componentName: string): void {
  if (!ENABLED) return;

  try {
    const key = `component_usage_${componentName}`;
    const timestamp = new Date().toISOString();

    // Get existing usage data
    const existingData = localStorage.getItem(key);
    const usageData = existingData ? JSON.parse(existingData) : { count: 0, first_used: timestamp };

    // Update count and last used
    usageData.count += 1;
    usageData.last_used = timestamp;

    // Store updated data
    localStorage.setItem(key, JSON.stringify(usageData));

    // Log first usage for visibility
    if (usageData.count === 1) {
      console.debug(`[USAGE] Component first rendered: ${componentName}`);
    }
  } catch (error) {
    // Silently fail - don't break the app for tracking issues
    console.warn(`Usage tracking failed for ${componentName}:`, error);
  }
}

/**
 * Get all component usage statistics
 */
export function getComponentUsageStats(): Record<string, { count: number; first_used: string; last_used: string }> {
  if (!ENABLED) return {};

  const stats: Record<string, any> = {};

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('component_usage_')) {
        const componentName = key.replace('component_usage_', '');
        const data = localStorage.getItem(key);
        if (data) {
          stats[componentName] = JSON.parse(data);
        }
      }
    }
  } catch (error) {
    console.warn('Failed to get component usage stats:', error);
  }

  return stats;
}

/**
 * Export usage data for analysis
 */
export function exportUsageData(): string {
  const stats = getComponentUsageStats();
  return JSON.stringify({
    exported_at: new Date().toISOString(),
    tracking_enabled: ENABLED,
    environment: import.meta.env.MODE,
    components: stats,
    total_components_tracked: Object.keys(stats).length
  }, null, 2);
}

/**
 * Clear all usage tracking data (use with caution!)
 */
export function clearUsageData(): void {
  if (!confirm('Clear all component usage tracking data? This cannot be undone.')) {
    return;
  }

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('component_usage_')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`Cleared ${keysToRemove.length} component usage entries`);
  } catch (error) {
    console.error('Failed to clear usage data:', error);
  }
}
