/**
 * Platform Detection Utilities for Navigation Export
 */

export interface PlatformInfo {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isDesktop: boolean;
  userAgent: string;
}

export function detectPlatform(): PlatformInfo {
  const userAgent = navigator.userAgent.toLowerCase();
  
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  const isMobile = isIOS || isAndroid || /mobile/.test(userAgent);
  const isDesktop = !isMobile;
  const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
  const isChrome = /chrome/.test(userAgent) && !/edge/.test(userAgent);

  return {
    isMobile,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isDesktop,
    userAgent
  };
}

export interface NavigationApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  supportedPlatforms: ('ios' | 'android' | 'desktop')[];
  isAvailable: (platform: PlatformInfo) => boolean;
  urlBuilder: (route: any) => string;
  priority: number; // Lower number = higher priority
}

export const NAVIGATION_APPS: NavigationApp[] = [
  {
    id: 'google-maps',
    name: 'Google Maps',
    description: 'Most popular navigation app with real-time traffic',
    icon: '🗺️',
    supportedPlatforms: ['ios', 'android', 'desktop'],
    isAvailable: () => true, // Available everywhere
    urlBuilder: (route) => {
      const waypoints = route.waypoints && route.waypoints.length
        ? `&waypoints=${route.waypoints.map((w: any) => `${w.lat},${w.lng}`).join('|')}`
        : '';
      return `https://www.google.com/maps/dir/?api=1&origin=${route.origin.lat},${route.origin.lng}&destination=${route.destination.lat},${route.destination.lng}${waypoints}`;
    },
    priority: 1
  },
  {
    id: 'apple-maps',
    name: 'Apple Maps',
    description: 'Native iOS navigation with great integration',
    icon: '🍎',
    supportedPlatforms: ['ios', 'desktop'],
    isAvailable: (platform) => platform.isIOS || platform.isSafari,
    urlBuilder: (route) => {
      const waypoints = route.waypoints && route.waypoints.length
        ? `&waypoints=${route.waypoints.map((w: any) => `${w.lat},${w.lng}`).join('|')}`
        : '';
      return `https://maps.apple.com/?saddr=${route.origin.lat},${route.origin.lng}&daddr=${route.destination.lat},${route.destination.lng}${waypoints}`;
    },
    priority: 2
  },
  {
    id: 'waze',
    name: 'Waze',
    description: 'Community-driven navigation with traffic alerts',
    icon: '🚗',
    supportedPlatforms: ['ios', 'android'],
    isAvailable: (platform) => platform.isMobile,
    urlBuilder: (route) => {
      return `https://waze.com/ul?ll=${route.destination.lat}%2C${route.destination.lng}&navigate=yes`;
    },
    priority: 3
  },
  {
    id: 'here-we-go',
    name: 'HERE WeGo',
    description: 'Offline maps and navigation',
    icon: '📍',
    supportedPlatforms: ['ios', 'android', 'desktop'],
    isAvailable: (platform) => platform.isMobile,
    urlBuilder: (route) => {
      return `https://share.here.com/r/${route.origin.lat},${route.origin.lng}/${route.destination.lat},${route.destination.lng}`;
    },
    priority: 4
  }
];

/**
 * Get available navigation apps for current platform
 */
export function getAvailableNavigationApps(platform: PlatformInfo): NavigationApp[] {
  return NAVIGATION_APPS
    .filter(app => app.isAvailable(platform))
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Get the best navigation app for current platform
 */
export function getBestNavigationApp(platform: PlatformInfo): NavigationApp | null {
  const availableApps = getAvailableNavigationApps(platform);
  return availableApps.length > 0 ? availableApps[0] : null;
}

/**
 * Generate a navigation URL for the best available app
 */
export function generateNavigationURL(route: any, platform?: PlatformInfo): string | null {
  const detectedPlatform = platform || detectPlatform();
  const bestApp = getBestNavigationApp(detectedPlatform);
  
  if (!bestApp) return null;
  
  return bestApp.urlBuilder(route);
}