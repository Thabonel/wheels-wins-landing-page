import { lazy } from 'react';

// Lazy load heavy Mapbox-dependent components
export const LazyIntegratedTripPlanner = lazy(() => 
  import('./OptimizedIntegratedTripPlanner').then(module => ({
    default: module.default
  }))
);

export const LazyMapControls = lazy(() => 
  import('./MapControls').then(module => ({
    default: module.default
  }))
);

export const LazyDirectionsControl = lazy(() => 
  import('./DirectionsControl').then(module => ({
    default: module.default
  }))
);

export const LazyPOILayer = lazy(() => 
  import('./POILayer').then(module => ({
    default: module.default
  }))
);

export const LazyFriendsLayer = lazy(() => 
  import('./FriendsLayer').then(module => ({
    default: module.default
  }))
);

export const LazyWheelersLayer = lazy(() => 
  import('./WheelersLayer').then(module => ({
    default: module.default
  }))
);

// Components that can be loaded immediately (no Mapbox dependencies)
export { default as BudgetSidebar } from './BudgetSidebar';
export { default as SocialSidebar } from './SocialSidebar';
export { default as SocialTripCoordinator } from './SocialTripCoordinator';
export { default as NavigationExportHub } from './NavigationExportHub';
export { default as TripStats } from './TripStats';
export { default as TripPlannerHeader } from './TripPlannerHeader';
export { default as EnhancedTripStats } from './EnhancedTripStats';