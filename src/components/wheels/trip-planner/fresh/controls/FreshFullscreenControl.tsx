import { useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';

export class FreshFullscreenControl implements mapboxgl.IControl {
  private container: HTMLDivElement | undefined;
  private button: HTMLButtonElement | undefined;
  private map: mapboxgl.Map | undefined;
  private isFullscreen: boolean = false;
  private originalParent: HTMLElement | null = null;
  private originalNextSibling: Node | null = null;

  onAdd(map: mapboxgl.Map): HTMLElement {
    this.map = map;
    this.container = document.createElement('div');
    this.container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';

    this.button = document.createElement('button');
    this.button.className = 'mapboxgl-ctrl-icon';
    this.button.type = 'button';
    this.button.title = 'Toggle fullscreen';
    this.button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
      </svg>
    `;

    this.button.onclick = () => this.toggleFullscreen();
    this.container.appendChild(this.button);

    return this.container;
  }

  onRemove(): void {
    if (this.container?.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.map = undefined;
  }

  private toggleFullscreen(): void {
    console.log('FreshFullscreenControl: Toggle fullscreen clicked, current state:', this.isFullscreen);
    if (!this.map) return;

    const mapContainer = this.map.getContainer();
    // Find the main trip planner root container using data attribute
    const tripPlannerWrapper = mapContainer.closest('[data-trip-planner-root="true"]') as HTMLElement | null;

    if (!tripPlannerWrapper) {
      console.error('FreshFullscreenControl: Could not find trip planner root container');
      return;
    }

    if (!this.isFullscreen) {
      // Store original position
      console.log('FreshFullscreenControl: Entering fullscreen mode');
      this.originalParent = tripPlannerWrapper.parentElement;
      this.originalNextSibling = tripPlannerWrapper.nextSibling;
      console.log('FreshFullscreenControl: Stored original parent:', this.originalParent);
      console.log('FreshFullscreenControl: Stored original next sibling:', this.originalNextSibling);

      // Move entire trip planner wrapper to fullscreen
      document.body.appendChild(tripPlannerWrapper);

      // Prevent body scrolling when fullscreen is active
      document.body.style.overflow = 'hidden';

      // Add CSS class and inline styles for fullscreen
      tripPlannerWrapper.classList.add('mapbox-fullscreen');

      // Apply fullscreen styles to the wrapper
      // Use z-index: 100000 to ensure panels (z-index: 10000) work inside
      tripPlannerWrapper.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 100000 !important;
        background: white;
        overflow: hidden !important;
      `;

      mapContainer.style.cssText = `
        width: 100% !important;
        height: 100% !important;
      `;

      // Update button icon
      this.button!.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
        </svg>
      `;
      this.button!.title = 'Exit fullscreen';

      this.isFullscreen = true;
      
      // Trigger map resize
      setTimeout(() => {
        this.map?.resize();
      }, 100);

    } else {
      // Exit fullscreen
      this.exitFullscreen();
    }
  }

  private exitFullscreen(): void {
    console.log('FreshFullscreenControl: Attempting to exit fullscreen');
    if (!this.map) return;

    const mapContainer = this.map.getContainer();
    const tripPlannerWrapper = mapContainer.closest('[data-trip-planner-root="true"]') as HTMLElement | null;

    if (!tripPlannerWrapper) {
      console.error('FreshFullscreenControl: Could not find trip planner wrapper during exit');
      return;
    }

    if (!this.originalParent) {
      console.error('FreshFullscreenControl: No original parent stored');
      return;
    }

    try {
      // Restore original position
      console.log('FreshFullscreenControl: Restoring original position');
      if (this.originalNextSibling && this.originalNextSibling.parentNode === this.originalParent) {
        this.originalParent.insertBefore(tripPlannerWrapper, this.originalNextSibling);
      } else {
        this.originalParent.appendChild(tripPlannerWrapper);
      }

      // Clear fullscreen styles more thoroughly
      console.log('FreshFullscreenControl: Clearing fullscreen styles');

      // Restore body scrolling
      document.body.style.overflow = '';

      // Remove fullscreen CSS class
      tripPlannerWrapper.classList.remove('mapbox-fullscreen');

      tripPlannerWrapper.style.position = '';
      tripPlannerWrapper.style.top = '';
      tripPlannerWrapper.style.left = '';
      tripPlannerWrapper.style.right = '';
      tripPlannerWrapper.style.bottom = '';
      tripPlannerWrapper.style.width = '';
      tripPlannerWrapper.style.height = '';
      tripPlannerWrapper.style.zIndex = '';
      tripPlannerWrapper.style.background = '';
      tripPlannerWrapper.style.overflow = '';

      mapContainer.style.width = '';
      mapContainer.style.height = '';

      // Update button icon
      this.button!.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>
      `;
      this.button!.title = 'Toggle fullscreen';

      this.isFullscreen = false;

      console.log('FreshFullscreenControl: Successfully exited fullscreen');

      // Trigger map resize
      setTimeout(() => {
        this.map?.resize();
      }, 100);

    } catch (error) {
      console.error('FreshFullscreenControl: Error during exit fullscreen:', error);
      // Reset state even if restoration failed
      this.isFullscreen = false;
    }
  }
}

// Optional: Export a React hook for fullscreen state
export const useMapFullscreen = (map: mapboxgl.Map | null) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!map) return;

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [map]);

  return isFullscreen;
};