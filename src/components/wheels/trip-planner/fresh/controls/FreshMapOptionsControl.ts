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
  overlays?: MapOverlay[];
}

export class FreshMapOptionsControl {
  private map?: mapboxgl.Map;
  private container?: HTMLElement;
  private options: FreshMapOptionsControlOptions;
  private dropdown?: HTMLElement;
  private isOpen: boolean = false;
  private mapContainer?: HTMLElement;

  private styles: MapStyle[] = [
    { name: 'Outdoors', value: 'mapbox://styles/mapbox/outdoors-v12', icon: '🏔️' },
    { name: 'Australia Offroad', value: 'mapbox://styles/thabonel/cm5ddi89k002301s552zx2fyc', icon: '🗺️' },
    { name: 'Satellite', value: 'mapbox://styles/mapbox/satellite-streets-v12', icon: '🛰️' },
    { name: 'Navigation', value: 'mapbox://styles/mapbox/navigation-day-v1', icon: '🧭' },
    { name: 'Streets', value: 'mapbox://styles/mapbox/streets-v12', icon: '🏙️' },
  ];

  constructor(options: FreshMapOptionsControlOptions) {
    this.options = options;
  }

  // Initialize the control without adding it to the map
  initialize(map: mapboxgl.Map, mapContainer: HTMLElement): void {
    this.map = map;
    this.mapContainer = mapContainer;
    
    // Create container positioned in the map
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      top: 60px;
      left: 10px;
      z-index: 10001;
    `;
    
    // Create dropdown
    this.dropdown = document.createElement('div');
    this.dropdown.style.cssText = `
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      width: 280px;
      display: none;
      overflow: hidden;
    `;
    
    // Build dropdown content
    this.buildDropdownContent();
    
    // Close dropdown when clicking outside
    const closeHandler = (e: MouseEvent) => {
      if (!this.dropdown?.contains(e.target as Node) && this.isOpen) {
        this.closeDropdown();
      }
    };
    document.addEventListener('click', closeHandler);
    
    // Store handler for cleanup
    (this as any)._closeHandler = closeHandler;
    
    // Append dropdown to container
    this.container.appendChild(this.dropdown);
    
    // Add container to map container
    this.mapContainer.appendChild(this.container);
  }
  
  cleanup(): void {
    if ((this as any)._closeHandler) {
      document.removeEventListener('click', (this as any)._closeHandler);
    }
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
      toggle.checked = this.options.overlays?.find(o => o.id === overlay.id)?.enabled || false;
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

    // Navigation Features section
    const navigationSection = document.createElement('div');
    navigationSection.style.cssText = 'padding: 12px; border-top: 1px solid #eee;';

    const navigationTitle = document.createElement('div');
    navigationTitle.textContent = '🧭 Navigation Features';
    navigationTitle.style.cssText = 'font-weight: 600; font-size: 12px; color: #333; margin-bottom: 8px;';
    navigationSection.appendChild(navigationTitle);

    // Navigation feature toggles
    const navigationOptions = [
      { id: 'navigation-tracking', name: 'Navigation Tracking', icon: '🎯', description: 'Map follows as you move' },
      { id: 'show-heading', name: 'Show Direction Arrow', icon: '➡️', description: 'Display compass heading' },
    ];

    navigationOptions.forEach(feature => {
      const featureItem = document.createElement('div');
      featureItem.style.cssText = 'margin-bottom: 8px;';

      const featureLabel = document.createElement('label');
      featureLabel.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        padding: 6px 8px;
        border-radius: 4px;
        transition: background-color 0.2s;
      `;

      const featureInfo = document.createElement('div');
      featureInfo.style.cssText = 'display: flex; align-items: center; gap: 8px;';

      const featureIcon = document.createElement('span');
      featureIcon.textContent = feature.icon;
      featureIcon.style.fontSize = '16px';

      const featureText = document.createElement('div');
      featureText.innerHTML = `
        <div style="font-size: 13px; color: #374151; font-weight: 500;">${feature.name}</div>
        <div style="font-size: 11px; color: #6b7280;">${feature.description}</div>
      `;

      featureInfo.appendChild(featureIcon);
      featureInfo.appendChild(featureText);

      // Toggle switch
      const toggleWrapper = document.createElement('div');
      toggleWrapper.style.cssText = 'position: relative;';

      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.id = `navigation-${feature.id}`;
      toggle.checked = feature.id === 'show-heading'; // Show heading enabled by default
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
        this.options.onOverlayToggle(feature.id, isChecked);
      });

      featureLabel.addEventListener('mouseover', () => {
        featureLabel.style.backgroundColor = '#f9fafb';
      });

      featureLabel.addEventListener('mouseout', () => {
        featureLabel.style.backgroundColor = 'transparent';
      });

      featureLabel.appendChild(featureInfo);
      featureLabel.appendChild(toggleWrapper);
      featureItem.appendChild(featureLabel);
      navigationSection.appendChild(featureItem);
    });

    this.dropdown.appendChild(navigationSection);
  }

  // Public methods for external control
  public toggleDropdown(): void {
    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }
  
  public openDropdown(): void {
    if (this.dropdown) {
      this.dropdown.style.display = 'block';
      this.isOpen = true;
    }
  }
  
  public closeDropdown(): void {
    if (this.dropdown) {
      this.dropdown.style.display = 'none';
      this.isOpen = false;
    }
  }
}