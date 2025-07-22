import mapboxgl from 'mapbox-gl';
import React from 'react';
import { createRoot } from 'react-dom/client';

// Simplified test button component
const TestButton = ({ onStyleChange }) => {
  return React.createElement('button', {
    style: {
      width: '30px',
      height: '30px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      background: 'white',
      cursor: 'pointer',
      borderRadius: '2px',
      fontSize: '14px'
    },
    onClick: () => {
      console.log('Debug button clicked!');
      if (onStyleChange) onStyleChange('mapbox://styles/mapbox/satellite-v9');
    }
  }, '🗂️');
};

export class DebugMapOptionsControl {
  constructor(options) {
    console.log('🔧 DebugMapOptionsControl: Constructor called', options);
    this.options = options;
  }

  onAdd(map) {
    console.log('🔧 DebugMapOptionsControl: onAdd called', map);
    this.map = map;
    this.container = document.createElement('div');
    this.container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
    this.container.style.cssText = 'background: white; border-radius: 3px; box-shadow: 0 0 0 2px rgba(0,0,0,.1);';

    console.log('🔧 DebugMapOptionsControl: Creating React root');
    
    try {
      // Create React root
      this.root = createRoot(this.container);
      console.log('🔧 DebugMapOptionsControl: React root created successfully');
      
      // Render simple test component
      this.root.render(
        React.createElement(TestButton, {
          onStyleChange: this.options.onStyleChange
        })
      );
      console.log('🔧 DebugMapOptionsControl: Component rendered successfully');
      
    } catch (error) {
      console.error('🔧 DebugMapOptionsControl: Error creating React component', error);
      
      // Fallback to plain HTML button
      const fallbackButton = document.createElement('button');
      fallbackButton.innerHTML = '📍';
      fallbackButton.style.cssText = 'width: 30px; height: 30px; border: none; background: white; cursor: pointer;';
      fallbackButton.onclick = () => {
        console.log('Fallback button clicked!');
        if (this.options.onStyleChange) {
          this.options.onStyleChange('mapbox://styles/mapbox/satellite-v9');
        }
      };
      this.container.appendChild(fallbackButton);
      console.log('🔧 DebugMapOptionsControl: Fallback button created');
    }

    console.log('🔧 DebugMapOptionsControl: Returning container', this.container);
    return this.container;
  }

  onRemove() {
    console.log('🔧 DebugMapOptionsControl: onRemove called');
    if (this.root) {
      try {
        this.root.unmount();
        console.log('🔧 DebugMapOptionsControl: React root unmounted');
      } catch (error) {
        console.error('🔧 DebugMapOptionsControl: Error unmounting root', error);
      }
    }
    if (this.container?.parentNode) {
      this.container.parentNode.removeChild(this.container);
      console.log('🔧 DebugMapOptionsControl: Container removed from DOM');
    }
    this.map = undefined;
  }
}