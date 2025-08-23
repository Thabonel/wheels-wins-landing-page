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
    if (!this.map) return;

    const mapContainer = this.map.getContainer();
    // Find the main trip planner root container using data attribute
    let tripPlannerWrapper = mapContainer.closest('[data-trip-planner-root="true"]') as HTMLElement | null;

    if (!tripPlannerWrapper) {
      console.error('Could not find trip planner root container');
      return;
    }

    if (!this.isFullscreen) {
      // Store original position
      this.originalParent = tripPlannerWrapper.parentElement;
      this.originalNextSibling = tripPlannerWrapper.nextSibling;

      // Move entire trip planner wrapper to fullscreen
      document.body.appendChild(tripPlannerWrapper);
      
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
    if (!this.map) return;

    const mapContainer = this.map.getContainer();
    const tripPlannerWrapper = mapContainer.closest('[data-trip-planner-root="true"]') as HTMLElement | null;

    if (!tripPlannerWrapper || !this.originalParent) return;

    // Restore original position
    if (this.originalNextSibling) {
      this.originalParent.insertBefore(tripPlannerWrapper, this.originalNextSibling);
    } else {
      this.originalParent.appendChild(tripPlannerWrapper);
    }

    // Remove fullscreen styles
    tripPlannerWrapper.style.cssText = '';
    mapContainer.style.cssText = '';

    // Update button icon
    this.button!.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
      </svg>
    `;
    this.button!.title = 'Toggle fullscreen';

    this.isFullscreen = false;

    // Trigger map resize
    setTimeout(() => {
      this.map?.resize();
    }, 100);
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