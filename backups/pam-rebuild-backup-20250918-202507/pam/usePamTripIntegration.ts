import { useEffect } from 'react';

interface RouteData {
  origin: { name: string };
  destination: { name: string };
  message?: string;
}

interface PamTripIntegrationProps {
  onRouteReceived?: (routeData: RouteData) => void;
  onNavigateToTrips?: () => void;
}

/**
 * Hook for integrating PAM route planning with trip planner components
 */
export function usePamTripIntegration({ 
  onRouteReceived, 
  onNavigateToTrips 
}: PamTripIntegrationProps = {}) {
  
  useEffect(() => {
    const handleDisplayRoute = (event: CustomEvent<RouteData>) => {
      console.log('🗺️ PAM trip integration: Displaying route', event.detail);
      
      if (onRouteReceived) {
        onRouteReceived(event.detail);
      } else {
        // Default behavior: try to fill trip planner form
        const { origin, destination } = event.detail;
        
        // Try to find and fill origin/destination inputs
        const originInput = document.querySelector('#origin-input, [name="origin"], [placeholder*="origin" i]') as HTMLInputElement;
        const destInput = document.querySelector('#destination-input, [name="destination"], [placeholder*="destination" i]') as HTMLInputElement;
        
        if (originInput && origin.name) {
          originInput.value = origin.name;
          originInput.dispatchEvent(new Event('input', { bubbles: true }));
          originInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        if (destInput && destination.name) {
          destInput.value = destination.name;
          destInput.dispatchEvent(new Event('input', { bubbles: true }));
          destInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Try to trigger route calculation
        const planButton = document.querySelector('#plan-route-btn, [data-action="plan-route"], button:has-text("Plan Route")') as HTMLButtonElement;
        if (planButton) {
          setTimeout(() => planButton.click(), 500);
        }
      }
    };

    const handleNavigateToTrips = () => {
      console.log('🧭 PAM trip integration: Navigating to trips');
      if (onNavigateToTrips) {
        onNavigateToTrips();
      }
    };

    // Listen for PAM route display events
    window.addEventListener('pam-display-route', handleDisplayRoute as EventListener);
    window.addEventListener('pam-navigate-trips', handleNavigateToTrips);

    return () => {
      window.removeEventListener('pam-display-route', handleDisplayRoute as EventListener);
      window.removeEventListener('pam-navigate-trips', handleNavigateToTrips);
    };
  }, [onRouteReceived, onNavigateToTrips]);

  // Helper function to manually trigger route display
  const displayRoute = (origin: string, destination: string) => {
    window.dispatchEvent(new CustomEvent('pam-display-route', {
      detail: {
        origin: { name: origin },
        destination: { name: destination },
        message: `Route from ${origin} to ${destination}`
      }
    }));
  };

  return {
    displayRoute
  };
}