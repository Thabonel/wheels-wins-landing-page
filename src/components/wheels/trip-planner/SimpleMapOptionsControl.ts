import mapboxgl from 'mapbox-gl';

interface SimpleMapOptionsControlOptions {
  onStyleChange: (style: string) => void;
}

export class SimpleMapOptionsControl implements mapboxgl.IControl {
  private map?: mapboxgl.Map;
  private container?: HTMLElement;
  private options: SimpleMapOptionsControlOptions;

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
    
    // Add icon - using a simple Unicode character
    button.innerHTML = '🗂️';
    
    // Add click handler
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🗂️ SimpleMapOptionsControl: Button clicked');
      
      // Test style change
      if (this.options.onStyleChange) {
        const currentStyle = this.map?.getStyle().name || '';
        const newStyle = currentStyle.includes('satellite') 
          ? 'mapbox://styles/mapbox/streets-v11'
          : 'mapbox://styles/mapbox/satellite-streets-v12';
        
        console.log('🗂️ SimpleMapOptionsControl: Changing style to', newStyle);
        this.options.onStyleChange(newStyle);
      }
    });

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
    if (this.container?.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.map = undefined;
  }
}