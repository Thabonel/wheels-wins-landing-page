import mapboxgl from 'mapbox-gl';

export interface Waypoint {
  id: string;
  name: string;
  coordinates: [number, number];
  address?: string;
  type: 'origin' | 'destination' | 'waypoint';
}

interface FreshTrackControlOptions {
  waypoints: Waypoint[];
  routeProfile: 'driving' | 'walking' | 'cycling';
  rvServices: { [key: string]: boolean };
  onRemoveWaypoint: (id: string) => void;
  onSetRouteProfile: (profile: 'driving' | 'walking' | 'cycling') => void;
  onRVServiceToggle: (service: string, enabled: boolean) => void;
}

export class FreshTrackControl implements mapboxgl.IControl {
  private map?: mapboxgl.Map;
  private container?: HTMLElement;
  private button?: HTMLButtonElement;
  private panel?: HTMLElement;
  private options: FreshTrackControlOptions;
  private isOpen: boolean = false;

  constructor(options: FreshTrackControlOptions) {
    this.options = options;
    console.log('[TrackControl] Constructor called');
  }

  onAdd(map: mapboxgl.Map): HTMLElement {
    console.log('[TrackControl] onAdd called');
    this.map = map;
    this.container = document.createElement('div');
    this.container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
    this.container.style.position = 'relative';
    this.container.style.overflow = 'visible'; // Allow panel to extend outside
    
    // Create toggle button
    this.button = document.createElement('button');
    this.button.className = 'mapboxgl-ctrl-icon';
    this.button.type = 'button';
    this.button.setAttribute('aria-label', 'Track Management');
    this.button.title = 'Track Management';
    
    // Style the button with menu icon
    this.button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    `;
    
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
      color: #333;
    `;
    
    // Create panel
    this.createPanel();
    console.log('[TrackControl] Panel created:', this.panel);
    
    // Add event listeners
    console.log('[TrackControl] Button created:', this.button);
    this.button.addEventListener('click', (e) => {
      console.log('[TrackControl] Button clicked!');
      e.stopPropagation(); // Prevent event from bubbling to document
      this.togglePanel();
    });
    
    // Close panel when clicking outside
    // Use setTimeout to avoid race condition with button click
    document.addEventListener('click', (e) => {
      // Don't close if clicking the button or panel
      if (this.panel && this.isOpen && 
          !this.container?.contains(e.target as Node) && 
          !this.panel.contains(e.target as Node)) {
        console.log('[TrackControl] Document click detected - closing panel');
        this.closePanel();
      }
    });
    
    // Assemble control
    this.container.appendChild(this.button);
    if (this.panel) {
      this.container.appendChild(this.panel); // Append to container, not body
      console.log('[TrackControl] Panel appended to container');
      const panelInDOM = this.container.contains(this.panel);
      console.log('[TrackControl] Panel in container:', panelInDOM);
    } else {
      console.error('[TrackControl] Panel is null!');
    }
    
    return this.container;
  }
  
  onRemove(): void {
    // Container removal will handle everything including the panel
    if (this.container?.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.map = undefined;
  }
  
  private createPanel(): void {
    console.log('[TrackControl] createPanel called');
    
    if (this.panel) {
      console.warn('[TrackControl] Panel already exists!');
      return;
    }
    
    this.panel = document.createElement('div');
    this.panel.id = 'track-management-panel'; // Add ID for easier debugging
    console.log('[TrackControl] Panel element created');
    this.panel.style.cssText = `
      position: absolute;
      top: 0;
      left: -330px;
      width: 320px;
      height: 500px;
      max-height: calc(100vh - 100px);
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 1000;
      transition: transform 0.3s ease;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
    `;
    
    this.updatePanelContent();
    console.log('[TrackControl] Panel content updated');
  }
  
  public updateOptions(options: Partial<FreshTrackControlOptions>): void {
    this.options = { ...this.options, ...options };
    this.updatePanelContent();
  }
  
  private updatePanelContent(): void {
    if (!this.panel) return;
    
    // Clear existing content
    this.panel.innerHTML = '';
    
    // Header
    const header = document.createElement('div');
    header.style.cssText = 'padding: 16px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between;';
    
    const title = document.createElement('h3');
    title.textContent = 'Track Management';
    title.style.cssText = 'font-size: 18px; font-weight: 600; color: #111827; margin: 0;';
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    closeButton.style.cssText = `
      width: 32px;
      height: 32px;
      padding: 6px;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 4px;
      transition: background-color 0.2s;
      color: #6b7280;
    `;
    closeButton.onmouseover = () => closeButton.style.backgroundColor = '#f3f4f6';
    closeButton.onmouseout = () => closeButton.style.backgroundColor = 'transparent';
    closeButton.onclick = () => this.closePanel();
    
    header.appendChild(title);
    header.appendChild(closeButton);
    this.panel.appendChild(header);
    
    // Content container with scroll
    const content = document.createElement('div');
    content.style.cssText = 'flex: 1; overflow-y: auto; padding: 16px;';
    
    // Waypoints section
    const waypointsSection = this.createWaypointsSection();
    content.appendChild(waypointsSection);
    
    // Route profile section
    const routeProfileSection = this.createRouteProfileSection();
    content.appendChild(routeProfileSection);
    
    // RV Services section
    const rvServicesSection = this.createRVServicesSection();
    content.appendChild(rvServicesSection);
    
    this.panel.appendChild(content);
  }
  
  private createWaypointsSection(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 24px;';
    
    const sectionTitle = document.createElement('h4');
    sectionTitle.textContent = `Waypoints (${this.options.waypoints.length})`;
    sectionTitle.style.cssText = 'font-size: 14px; font-weight: 500; color: #6b7280; margin-bottom: 12px;';
    section.appendChild(sectionTitle);
    
    if (this.options.waypoints.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.style.cssText = 'text-align: center; padding: 16px; background: #f9fafb; border-radius: 8px;';
      emptyState.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" style="margin: 0 auto 8px;">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        <p style="color: #9ca3af; font-size: 14px; margin: 0;">No waypoints added yet</p>
        <p style="color: #9ca3af; font-size: 12px; margin: 4px 0 0;">Click the "+" button then click on the map</p>
      `;
      section.appendChild(emptyState);
    } else {
      const waypointsList = document.createElement('div');
      waypointsList.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
      
      this.options.waypoints.forEach((waypoint, index) => {
        const waypointItem = document.createElement('div');
        waypointItem.style.cssText = `
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
          transition: background-color 0.2s;
          position: relative;
          group: true;
        `;
        
        const number = document.createElement('div');
        number.textContent = String(index + 1);
        number.style.cssText = `
          width: 32px;
          height: 32px;
          background: #2563eb;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 500;
          flex-shrink: 0;
        `;
        
        const info = document.createElement('div');
        info.style.cssText = 'flex: 1; min-width: 0;';
        
        const name = document.createElement('p');
        name.textContent = waypoint.name;
        name.style.cssText = 'font-size: 14px; font-weight: 500; color: #111827; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
        info.appendChild(name);
        
        if (waypoint.address) {
          const address = document.createElement('p');
          address.textContent = waypoint.address;
          address.style.cssText = 'font-size: 12px; color: #6b7280; margin: 2px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
          info.appendChild(address);
        }
        
        const removeButton = document.createElement('button');
        removeButton.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;
        removeButton.style.cssText = `
          width: 24px;
          height: 24px;
          padding: 4px;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 4px;
          opacity: 0;
          transition: opacity 0.2s, background-color 0.2s;
        `;
        
        waypointItem.onmouseover = () => {
          waypointItem.style.backgroundColor = '#f3f4f6';
          removeButton.style.opacity = '1';
        };
        waypointItem.onmouseout = () => {
          waypointItem.style.backgroundColor = '#f9fafb';
          removeButton.style.opacity = '0';
        };
        
        removeButton.onclick = () => this.options.onRemoveWaypoint(waypoint.id);
        removeButton.onmouseover = () => removeButton.style.backgroundColor = '#fee2e2';
        removeButton.onmouseout = () => removeButton.style.backgroundColor = 'transparent';
        
        waypointItem.appendChild(number);
        waypointItem.appendChild(info);
        waypointItem.appendChild(removeButton);
        waypointsList.appendChild(waypointItem);
      });
      
      section.appendChild(waypointsList);
    }
    
    return section;
  }
  
  private createRouteProfileSection(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 24px;';
    
    const sectionTitle = document.createElement('h4');
    sectionTitle.textContent = 'Route Profile';
    sectionTitle.style.cssText = 'font-size: 14px; font-weight: 500; color: #6b7280; margin-bottom: 12px;';
    section.appendChild(sectionTitle);
    
    const profileButtons = document.createElement('div');
    profileButtons.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;';
    
    const profiles = [
      { id: 'driving', label: 'Drive', icon: '🚗' },
      { id: 'cycling', label: 'Bike', icon: '🚴' },
      { id: 'walking', label: 'Walk', icon: '🚶' }
    ];
    
    profiles.forEach(profile => {
      const button = document.createElement('button');
      const isActive = this.options.routeProfile === profile.id;
      
      button.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 12px 8px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 14px;
        font-weight: 500;
        background: ${isActive ? '#2563eb' : '#f3f4f6'};
        color: ${isActive ? 'white' : '#374151'};
      `;
      
      button.innerHTML = `
        <span style="font-size: 20px;">${profile.icon}</span>
        <span>${profile.label}</span>
      `;
      
      button.onclick = () => this.options.onSetRouteProfile(profile.id as 'driving' | 'walking' | 'cycling');
      
      if (!isActive) {
        button.onmouseover = () => {
          button.style.backgroundColor = '#e5e7eb';
        };
        button.onmouseout = () => {
          button.style.backgroundColor = '#f3f4f6';
        };
      }
      
      profileButtons.appendChild(button);
    });
    
    section.appendChild(profileButtons);
    return section;
  }
  
  private createRVServicesSection(): HTMLElement {
    const section = document.createElement('div');
    
    const sectionTitle = document.createElement('h4');
    sectionTitle.textContent = 'RV Services';
    sectionTitle.style.cssText = 'font-size: 14px; font-weight: 500; color: #6b7280; margin-bottom: 12px;';
    section.appendChild(sectionTitle);
    
    const services = [
      { id: 'rvParks', label: 'RV Parks', icon: '🏕️' },
      { id: 'campgrounds', label: 'Campgrounds', icon: '⛺' },
      { id: 'dumpStations', label: 'Dump Stations', icon: '🚽' },
      { id: 'propane', label: 'Propane', icon: '🔥' },
      { id: 'waterFill', label: 'Water Fill', icon: '💧' },
      { id: 'rvRepair', label: 'RV Repair', icon: '🔧' }
    ];
    
    const servicesList = document.createElement('div');
    servicesList.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
    
    services.forEach(service => {
      const serviceItem = document.createElement('label');
      serviceItem.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px;
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.2s;
      `;
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = this.options.rvServices[service.id] || false;
      checkbox.style.cssText = 'width: 16px; height: 16px; cursor: pointer;';
      checkbox.onchange = () => {
        this.options.onRVServiceToggle(service.id, checkbox.checked);
      };
      
      const icon = document.createElement('span');
      icon.textContent = service.icon;
      icon.style.fontSize = '18px';
      
      const label = document.createElement('span');
      label.textContent = service.label;
      label.style.cssText = 'flex: 1; font-size: 14px; color: #374151;';
      
      serviceItem.onmouseover = () => serviceItem.style.backgroundColor = '#f9fafb';
      serviceItem.onmouseout = () => serviceItem.style.backgroundColor = 'transparent';
      
      serviceItem.appendChild(checkbox);
      serviceItem.appendChild(icon);
      serviceItem.appendChild(label);
      servicesList.appendChild(serviceItem);
    });
    
    section.appendChild(servicesList);
    return section;
  }
  
  public togglePanel(): void {
    console.log('[TrackControl] togglePanel - isOpen:', this.isOpen);
    console.log('[TrackControl] Panel exists:', !!this.panel);
    console.log('[TrackControl] Button exists:', !!this.button);
    
    if (this.isOpen) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }
  
  public openPanel(): void {
    console.log('[TrackControl] openPanel called');
    console.log('[TrackControl] Panel:', this.panel);
    console.log('[TrackControl] Button:', this.button);
    
    if (this.panel && this.button) {
      // Log current position
      console.log('[TrackControl] Current panel transform:', this.panel.style.transform);
      
      this.panel.style.transform = 'translateX(0)'; // Slide panel into view
      this.button.style.backgroundColor = '#f3f4f6';
      
      console.log('[TrackControl] Panel transform set to:', this.panel.style.transform);
      console.log('[TrackControl] Panel computed style:', window.getComputedStyle(this.panel).transform);
      
      // Change button icon to X
      this.button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
      
      this.isOpen = true;
      console.log('[TrackControl] Panel should now be visible');
    } else {
      console.error('[TrackControl] Cannot open - panel or button missing');
    }
  }
  
  public closePanel(): void {
    console.log('[TrackControl] closePanel called');
    if (this.panel && this.button) {
      this.panel.style.transform = 'translateX(100%)'; // Slide panel out of view
      console.log('[TrackControl] Panel hidden with transform:', this.panel.style.transform);
      this.button.style.backgroundColor = 'white';
      
      // Change button icon back to menu
      this.button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      `;
      
      this.isOpen = false;
    }
  }
}