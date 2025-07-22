import mapboxgl from 'mapbox-gl';
import React from 'react';
import { createRoot } from 'react-dom/client';
import MapOptionsDropdown from './MapOptionsDropdown';

interface MapOptionsControlOptions {
  onStyleChange: (style: string) => void;
  currentStyle: string;
  poiFilters: Record<string, boolean>;
  onPOIFilterChange: (filters: Record<string, boolean>) => void;
}

export class MapOptionsControl implements mapboxgl.IControl {
  private map?: mapboxgl.Map;
  private container?: HTMLElement;
  private root?: any;
  private options: MapOptionsControlOptions;

  constructor(options: MapOptionsControlOptions) {
    this.options = options;
  }

  onAdd(map: mapboxgl.Map): HTMLElement {
    this.map = map;
    this.container = document.createElement('div');
    this.container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';

    // Create React root and render the dropdown
    this.root = createRoot(this.container);
    this.renderDropdown();

    return this.container;
  }

  onRemove(): void {
    if (this.root) {
      this.root.unmount();
    }
    if (this.container?.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.map = undefined;
  }

  private renderDropdown(): void {
    if (!this.root || !this.map) return;

    const mapRef = { current: this.map };
    
    // Create a wrapper div to ensure proper event handling and prevent map interactions
    const wrapper = React.createElement('div', {
      style: { position: 'relative', zIndex: 999999 },
      onMouseDown: (e: React.MouseEvent) => {
        // Only prevent map interactions, not the button click
        e.stopPropagation();
      },
      onTouchStart: (e: React.TouchEvent) => {
        e.stopPropagation();
      }
    }, 
      React.createElement(MapOptionsDropdown, {
        map: mapRef,
        onStyleChange: this.options.onStyleChange,
        currentStyle: this.options.currentStyle,
        isMapControl: true,
        poiFilters: this.options.poiFilters,
        onPOIFilterChange: this.options.onPOIFilterChange
      })
    );
    
    this.root.render(wrapper);
  }

  // Method to update the control when needed
  updateOptions(newOptions: Partial<MapOptionsControlOptions>): void {
    this.options = { ...this.options, ...newOptions };
    this.renderDropdown();
  }
}