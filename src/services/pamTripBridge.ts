/**
 * PAM Trip Bridge
 *
 * Event-based communication system between PAM's trip planning tools
 * and the map interface. Uses a pub/sub pattern for loose coupling.
 *
 * Usage:
 * - PAM service dispatches actions when trip tools return results
 * - FreshTripPlanner subscribes to receive and render routes
 */

import {
  PAMTripAction,
  PAMTripActionResult,
  isPAMTripAction,
  createPAMTripAction,
  PAMWaypoint,
  PAMTripActionType,
  PAMRouteMetadata,
} from '../types/pamTripAction';

type PAMTripActionListener = (action: PAMTripAction) => void;
type PAMTripResultListener = (result: PAMTripActionResult) => void;

/**
 * PAM Trip Bridge - Singleton event system
 *
 * Enables communication between PAM responses and map components
 * without tight coupling.
 */
class PAMTripBridge {
  private actionListeners: Set<PAMTripActionListener> = new Set();
  private resultListeners: Set<PAMTripResultListener> = new Set();
  private actionHistory: PAMTripAction[] = [];
  private maxHistorySize = 20;
  private pendingAction: PAMTripAction | null = null;

  /**
   * Subscribe to trip action events
   * @param callback Function to call when an action is dispatched
   * @returns Unsubscribe function
   */
  subscribe(callback: PAMTripActionListener): () => void {
    this.actionListeners.add(callback);
    console.log('[PAMTripBridge] Subscriber added, total:', this.actionListeners.size);

    return () => {
      this.actionListeners.delete(callback);
      console.log('[PAMTripBridge] Subscriber removed, total:', this.actionListeners.size);
    };
  }

  /**
   * Unsubscribe from trip action events
   * @param callback The callback to remove
   */
  unsubscribe(callback: PAMTripActionListener): void {
    this.actionListeners.delete(callback);
    console.log('[PAMTripBridge] Subscriber removed, total:', this.actionListeners.size);
  }

  /**
   * Subscribe to action result events
   * @param callback Function to call when an action result is reported
   * @returns Unsubscribe function
   */
  subscribeToResults(callback: PAMTripResultListener): () => void {
    this.resultListeners.add(callback);
    return () => this.resultListeners.delete(callback);
  }

  /**
   * Dispatch a trip action to all subscribers
   * @param action The trip action to dispatch
   */
  dispatch(action: PAMTripAction): void {
    if (!isPAMTripAction(action)) {
      console.error('[PAMTripBridge] Invalid action:', action);
      return;
    }

    // Ensure action has ID and timestamp
    const enrichedAction: PAMTripAction = {
      ...action,
      actionId: action.actionId ?? `pam-trip-${Date.now()}`,
      timestamp: action.timestamp ?? Date.now(),
    };

    console.log('[PAMTripBridge] Dispatching action:', {
      type: enrichedAction.type,
      waypointCount: enrichedAction.waypoints.length,
      requiresConfirmation: enrichedAction.requiresConfirmation,
      actionId: enrichedAction.actionId,
    });

    // Store in history
    this.actionHistory.push(enrichedAction);
    if (this.actionHistory.length > this.maxHistorySize) {
      this.actionHistory.shift();
    }

    // Store as pending if requires confirmation
    if (enrichedAction.requiresConfirmation) {
      this.pendingAction = enrichedAction;
    }

    // Notify all subscribers
    if (this.actionListeners.size === 0) {
      console.warn('[PAMTripBridge] No subscribers! Action may not be handled.');
    }

    this.actionListeners.forEach(callback => {
      try {
        callback(enrichedAction);
      } catch (error) {
        console.error('[PAMTripBridge] Error in subscriber:', error);
      }
    });
  }

  /**
   * Report the result of applying an action
   * @param result The action result
   */
  reportResult(result: PAMTripActionResult): void {
    console.log('[PAMTripBridge] Action result:', result);

    // Clear pending action if this was it
    if (result.actionId && this.pendingAction?.actionId === result.actionId) {
      this.pendingAction = null;
    }

    this.resultListeners.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        console.error('[PAMTripBridge] Error in result subscriber:', error);
      }
    });
  }

  /**
   * Get the current pending action (awaiting confirmation)
   */
  getPendingAction(): PAMTripAction | null {
    return this.pendingAction;
  }

  /**
   * Clear the pending action
   */
  clearPendingAction(): void {
    this.pendingAction = null;
  }

  /**
   * Get action history
   */
  getHistory(): PAMTripAction[] {
    return [...this.actionHistory];
  }

  /**
   * Get the most recent action
   */
  getLastAction(): PAMTripAction | null {
    return this.actionHistory[this.actionHistory.length - 1] ?? null;
  }

  /**
   * Check if there are any subscribers
   */
  hasSubscribers(): boolean {
    return this.actionListeners.size > 0;
  }

  /**
   * Get subscriber count (for debugging)
   */
  getSubscriberCount(): number {
    return this.actionListeners.size;
  }

  /**
   * Clear all state (useful for testing)
   */
  reset(): void {
    this.actionListeners.clear();
    this.resultListeners.clear();
    this.actionHistory = [];
    this.pendingAction = null;
    console.log('[PAMTripBridge] Reset complete');
  }
}

// Singleton instance
export const pamTripBridge = new PAMTripBridge();

// Convenience functions for common operations

/**
 * Dispatch a REPLACE_ROUTE action
 */
export function dispatchReplaceRoute(
  waypoints: PAMWaypoint[],
  metadata?: PAMRouteMetadata,
  summary?: string
): void {
  pamTripBridge.dispatch(
    createPAMTripAction('REPLACE_ROUTE', waypoints, {
      metadata,
      summary: summary ?? `Route with ${waypoints.length} waypoints`,
      requiresConfirmation: true,
    })
  );
}

/**
 * Dispatch an ADD_STOP action
 */
export function dispatchAddStop(
  waypoint: PAMWaypoint,
  summary?: string
): void {
  pamTripBridge.dispatch(
    createPAMTripAction('ADD_STOP', [waypoint], {
      summary: summary ?? `Add stop: ${waypoint.name}`,
      requiresConfirmation: false, // Single stops auto-apply
    })
  );
}

/**
 * Dispatch an ADD_WAYPOINTS action
 */
export function dispatchAddWaypoints(
  waypoints: PAMWaypoint[],
  metadata?: PAMRouteMetadata,
  summary?: string
): void {
  pamTripBridge.dispatch(
    createPAMTripAction('ADD_WAYPOINTS', waypoints, {
      metadata,
      summary: summary ?? `Add ${waypoints.length} waypoints`,
      requiresConfirmation: waypoints.length > 1,
    })
  );
}

/**
 * Parse PAM tool response and extract map action if present
 * Call this from pamService when processing tool results
 */
export function extractMapActionFromToolResult(toolResult: unknown): PAMTripAction | null {
  if (!toolResult || typeof toolResult !== 'object') {
    return null;
  }

  const result = toolResult as Record<string, unknown>;

  // Check for explicit map_action field
  if (result.map_action && typeof result.map_action === 'object') {
    const mapAction = result.map_action as Record<string, unknown>;

    // Validate and convert to PAMTripAction
    if (
      typeof mapAction.type === 'string' &&
      Array.isArray(mapAction.waypoints)
    ) {
      const waypoints = (mapAction.waypoints as unknown[])
        .filter((wp): wp is Record<string, unknown> =>
          wp !== null && typeof wp === 'object'
        )
        .map((wp): PAMWaypoint => ({
          name: String(wp.name ?? 'Unknown'),
          coordinates: Array.isArray(wp.coordinates)
            ? [Number(wp.coordinates[0]), Number(wp.coordinates[1])]
            : [0, 0],
          type: (['origin', 'destination', 'waypoint'].includes(String(wp.type))
            ? String(wp.type)
            : 'waypoint') as PAMWaypoint['type'],
          description: wp.description ? String(wp.description) : undefined,
          poiType: wp.poiType ? String(wp.poiType) as PAMWaypoint['poiType'] : undefined,
          address: wp.address ? String(wp.address) : undefined,
        }));

      if (waypoints.length > 0) {
        const actionType = mapAction.type as PAMTripActionType;
        const metadata = mapAction.metadata as PAMRouteMetadata | undefined;

        return createPAMTripAction(actionType, waypoints, {
          metadata,
          summary: result.message ? String(result.message) : undefined,
          requiresConfirmation: actionType === 'REPLACE_ROUTE' || waypoints.length > 1,
        });
      }
    }
  }

  return null;
}

// Export types for consumers
export type {
  PAMTripAction,
  PAMTripActionResult,
  PAMWaypoint,
  PAMTripActionType,
  PAMRouteMetadata,
};

export { isPAMTripAction, createPAMTripAction };
