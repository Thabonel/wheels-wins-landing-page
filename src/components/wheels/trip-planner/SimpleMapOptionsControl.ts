import mapboxgl from 'mapbox-gl';
import React from 'react';
import { createRoot } from 'react-dom/client';

interface SimpleMapOptionsControlOptions {
  onStyleChange: (style: string) => void;
}

export class SimpleMapOptionsControl implements mapboxgl.IControl {
  private map?: mapboxgl.Map;
  private container?: HTMLElement;
  private options: SimpleMapOptionsControlOptions;
  private clickHandler?: (e: Event) => void;

  constructor(options: SimpleMapOptionsControlOptions) {
    console.log('🗂️ SimpleMapOptionsControl: Constructor called', options);
    this.options = options;
  }

  onAdd(map: mapboxgl.Map): HTMLElement {
    console.log('🗂️ SimpleMapOptionsControl: onAdd called', map);
    this.map = map;
    this.container = document.createElement('div');
    this.container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';

    // Create a simple button with plain HTML/CSS
    const button = document.createElement('button');
    button.className = 'mapboxgl-ctrl-icon';
    button.type = 'button';
    button.setAttribute('aria-label', 'Map Options');
    button.title = 'Map Options';
    
    // Simple styling to match other Mapbox controls
    button.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border: none;
      background: white;
      cursor: pointer;
      font-size: 16px;
      line-height: 30px;
      text-align: center;
      color: #333;
    `;
    
    // Add the proper Layers icon using SVG (same as Lucide Layers)
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12,2 2,7 12,12 22,7"></polygon>
        <polyline points="2,17 12,22 22,17"></polyline>
        <polyline points="2,12 12,17 22,12"></polyline>
      </svg>
    `;
    
    // Create dropdown for map options
    const dropdown = document.createElement('div');
    dropdown.className = 'map-options-dropdown';
    dropdown.style.cssText = `
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 5px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      min-width: 200px;
      z-index: 1000;
      display: none;
      padding: 8px 0;
    `;

    // Add map style options
    const styleOptions = [
      { name: 'Satellite', value: 'mapbox://styles/mapbox/satellite-streets-v12' },
      { name: 'Streets', value: 'mapbox://styles/mapbox/streets-v11' },
      { name: 'Outdoors', value: 'mapbox://styles/mapbox/outdoors-v12' },
      { name: 'Light', value: 'mapbox://styles/mapbox/light-v11' },
      { name: 'Dark', value: 'mapbox://styles/mapbox/dark-v11' }
    ];

    styleOptions.forEach(option => {
      const item = document.createElement('div');
      item.textContent = option.name;
      item.style.cssText = `
        padding: 8px 16px;
        cursor: pointer;
        font-size: 14px;
        color: #333;
      `;
      
      item.addEventListener('mouseover', () => {
        item.style.backgroundColor = '#f5f5f5';
      });
      
      item.addEventListener('mouseout', () => {
        item.style.backgroundColor = 'transparent';
      });
      
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('🗂️ SimpleMapOptionsControl: Changing style to', option.name);
        if (this.options.onStyleChange) {
          this.options.onStyleChange(option.value);
        }
        dropdown.style.display = 'none';
      });
      
      dropdown.appendChild(item);
    });

    // Make container relative for dropdown positioning
    this.container.style.position = 'relative';
    this.container.appendChild(dropdown);

    // Add click handler to button
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🗂️ SimpleMapOptionsControl: Button clicked');
      
      // Toggle dropdown
      const isVisible = dropdown.style.display === 'block';
      dropdown.style.display = isVisible ? 'none' : 'block';
    });

    // Close dropdown when clicking outside
    this.clickHandler = (e) => {
      if (!this.container?.contains(e.target as Node)) {
        dropdown.style.display = 'none';
      }
    };
    document.addEventListener('click', this.clickHandler);

    // Prevent map interactions when clicking the button
    button.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });

    this.container.appendChild(button);
    console.log('🗂️ SimpleMapOptionsControl: Container created and returned');
    return this.container;
  }

  onRemove(): void {
    console.log('🗂️ SimpleMapOptionsControl: onRemove called');
    
    // Remove global click handler
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler);
      this.clickHandler = undefined;
    }
    
    if (this.container?.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.map = undefined;
  }
}