import mapboxgl from 'mapbox-gl';

interface MapStyle {
  name: string;
  value: string;
  icon?: string;
}

interface MapOverlay {
  id: string;
  name: string;
  enabled: boolean;
}

interface FreshMapOptionsControlOptions {
  onStyleChange: (style: string) => void;
  onOverlayToggle: (overlayId: string, enabled: boolean) => void;
  currentStyle: string;
  overlays: MapOverlay[];
}

export class FreshMapOptionsControl implements mapboxgl.IControl {
  private map?: mapboxgl.Map;
  private container?: HTMLElement;
  private options: FreshMapOptionsControlOptions;
  private button?: HTMLButtonElement;
  private dropdown?: HTMLElement;
  private isOpen: boolean = false;

  private styles: MapStyle[] = [
    { name: 'Satellite', value: 'mapbox://styles/mapbox/satellite-streets-v12', icon: '🛰️' },
    { name: 'Outdoors', value: 'mapbox://styles/mapbox/outdoors-v12', icon: '🏔️' },
    { name: 'Navigation', value: 'mapbox://styles/mapbox/navigation-day-v1', icon: '🧭' },
    { name: 'Streets', value: 'mapbox://styles/mapbox/streets-v12', icon: '🏙️' },
  ];

  constructor(options: FreshMapOptionsControlOptions) {
    this.options = options;
  }

  onAdd(map: mapboxgl.Map): HTMLElement {
    this.map = map;
    this.container = document.createElement('div');
    this.container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
    
    // Create button
    this.button = document.createElement('button');
    this.button.className = 'mapboxgl-ctrl-icon';
    this.button.type = 'button';
    this.button.setAttribute('aria-label', 'Map Options');
    this.button.title = 'Map Options';
    
    // Style the button
    this.button.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      padding: 0;
      border: none;
      background: white;
      cursor: pointer;
      font-size: 14px;
      color: #333;
    `;
    
    // Set button text to MAP
    this.button.textContent = 'MAP';
    this.button.style.fontWeight = '600';
    this.button.style.fontSize = '11px';
    
    // Create dropdown
    this.dropdown = document.createElement('div');
    this.dropdown.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 5px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      width: 280px;
      z-index: 1000;
      display: none;
      overflow: hidden;
    `;
    
    // Build dropdown content
    this.buildDropdownContent();
    
    // Add event listeners
    this.button.addEventListener('click', () => this.toggleDropdown());
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.container?.contains(e.target as Node) && this.isOpen) {
        this.closeDropdown();
      }
    });
    
    // Assemble control
    this.container.appendChild(this.button);
    this.container.appendChild(this.dropdown);
    
    return this.container;
  }
  
  onRemove(): void {
    this.container?.parentNode?.removeChild(this.container);
    this.map = undefined;
  }
  
  private buildDropdownContent(): void {
    if (!this.dropdown) return;
    
    // Clear existing content
    this.dropdown.innerHTML = '';
    
    // Map Styles section
    const stylesSection = document.createElement('div');
    stylesSection.style.cssText = 'padding: 12px; border-bottom: 1px solid #eee;';
    
    const stylesTitle = document.createElement('div');
    stylesTitle.textContent = '🗺️ Map Styles';
    stylesTitle.style.cssText = 'font-weight: 600; font-size: 12px; color: #333; margin-bottom: 8px;';
    stylesSection.appendChild(stylesTitle);
    
    const stylesGrid = document.createElement('div');
    stylesGrid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 4px;';
    
    this.styles.forEach(style => {
      const styleButton = document.createElement('button');
      styleButton.style.cssText = `
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        border: 1px solid ${this.options.currentStyle === style.value ? '#2563eb' : '#e5e7eb'};
        background: ${this.options.currentStyle === style.value ? '#eff6ff' : 'white'};
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        color: ${this.options.currentStyle === style.value ? '#2563eb' : '#374151'};
        font-weight: ${this.options.currentStyle === style.value ? '600' : '400'};
        transition: all 0.2s;
        width: 100%;
        text-align: left;
      `;
      
      styleButton.innerHTML = `
        <span style="font-size: 16px;">${style.icon || ''}</span>
        <span>${style.name}</span>
      `;
      
      styleButton.addEventListener('click', () => {
        this.options.onStyleChange(style.value);
        this.options.currentStyle = style.value;
        this.buildDropdownContent(); // Rebuild to update selection
      });
      
      styleButton.addEventListener('mouseover', () => {
        if (this.options.currentStyle !== style.value) {
          styleButton.style.backgroundColor = '#f3f4f6';
          styleButton.style.borderColor = '#d1d5db';
        }
      });
      
      styleButton.addEventListener('mouseout', () => {
        if (this.options.currentStyle !== style.value) {
          styleButton.style.backgroundColor = 'white';
          styleButton.style.borderColor = '#e5e7eb';
        }
      });
      
      stylesGrid.appendChild(styleButton);
    });
    
    stylesSection.appendChild(stylesGrid);
    this.dropdown.appendChild(stylesSection);
    
    // Map Overlays section
    const overlaysSection = document.createElement('div');
    overlaysSection.style.cssText = 'padding: 12px;';
    
    const overlaysTitle = document.createElement('div');
    overlaysTitle.textContent = '📍 Map Overlays';
    overlaysTitle.style.cssText = 'font-weight: 600; font-size: 12px; color: #333; margin-bottom: 8px;';
    overlaysSection.appendChild(overlaysTitle);
    
    // Overlay toggles
    const overlayOptions = [
      { id: 'traffic', name: 'Traffic', icon: '🚦', description: 'Real-time traffic conditions' },
      { id: 'fires', name: 'Active Fires', icon: '🔥', description: 'Wildfire hotspots' },
      { id: 'coverage', name: 'Phone Coverage', icon: '📶', description: 'Cell signal areas' },
      { id: 'parks', name: 'National Parks', icon: '🏞️', description: 'Park boundaries' },
      { id: 'forests', name: 'State Forests', icon: '🌲', description: 'Forest boundaries' },
    ];
    
    overlayOptions.forEach(overlay => {
      const overlayItem = document.createElement('div');
      overlayItem.style.cssText = 'margin-bottom: 8px;';
      
      const overlayLabel = document.createElement('label');
      overlayLabel.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        padding: 6px 8px;
        border-radius: 4px;
        transition: background-color 0.2s;
      `;
      
      const overlayInfo = document.createElement('div');
      overlayInfo.style.cssText = 'display: flex; align-items: center; gap: 8px;';
      
      const overlayIcon = document.createElement('span');
      overlayIcon.textContent = overlay.icon;
      overlayIcon.style.fontSize = '16px';
      
      const overlayText = document.createElement('div');
      overlayText.innerHTML = `
        <div style="font-size: 13px; color: #374151; font-weight: 500;">${overlay.name}</div>
        <div style="font-size: 11px; color: #6b7280;">${overlay.description}</div>
      `;
      
      overlayInfo.appendChild(overlayIcon);
      overlayInfo.appendChild(overlayText);
      
      // Toggle switch
      const toggleWrapper = document.createElement('div');
      toggleWrapper.style.cssText = 'position: relative;';
      
      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.id = `overlay-${overlay.id}`;
      toggle.checked = this.options.overlays.find(o => o.id === overlay.id)?.enabled || false;
      toggle.style.cssText = 'position: absolute; opacity: 0; width: 0; height: 0;';
      
      const toggleSlider = document.createElement('div');
      toggleSlider.style.cssText = `
        width: 36px;
        height: 20px;
        background-color: ${toggle.checked ? '#3b82f6' : '#e5e7eb'};
        border-radius: 10px;
        position: relative;
        transition: background-color 0.3s;
        cursor: pointer;
      `;
      
      const toggleHandle = document.createElement('div');
      toggleHandle.style.cssText = `
        width: 16px;
        height: 16px;
        background-color: white;
        border-radius: 50%;
        position: absolute;
        top: 2px;
        left: ${toggle.checked ? '18px' : '2px'};
        transition: left 0.3s;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      `;
      
      toggleSlider.appendChild(toggleHandle);
      toggleWrapper.appendChild(toggle);
      toggleWrapper.appendChild(toggleSlider);
      
      toggle.addEventListener('change', () => {
        const isChecked = toggle.checked;
        toggleSlider.style.backgroundColor = isChecked ? '#3b82f6' : '#e5e7eb';
        toggleHandle.style.left = isChecked ? '18px' : '2px';
        this.options.onOverlayToggle(overlay.id, isChecked);
      });
      
      overlayLabel.addEventListener('mouseover', () => {
        overlayLabel.style.backgroundColor = '#f9fafb';
      });
      
      overlayLabel.addEventListener('mouseout', () => {
        overlayLabel.style.backgroundColor = 'transparent';
      });
      
      overlayLabel.appendChild(overlayInfo);
      overlayLabel.appendChild(toggleWrapper);
      overlayItem.appendChild(overlayLabel);
      overlaysSection.appendChild(overlayItem);
    });
    
    this.dropdown.appendChild(overlaysSection);
  }
  
  private toggleDropdown(): void {
    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }
  
  private openDropdown(): void {
    if (this.dropdown && this.button) {
      this.dropdown.style.display = 'block';
      this.button.style.backgroundColor = '#f3f4f6';
      this.isOpen = true;
    }
  }
  
  private closeDropdown(): void {
    if (this.dropdown && this.button) {
      this.dropdown.style.display = 'none';
      this.button.style.backgroundColor = 'white';
      this.isOpen = false;
    }
  }
}