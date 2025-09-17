/**
 * Lazy-loaded Admin Components
 * Reduces initial bundle size for AdminDashboard by implementing code splitting
 */

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load heavy admin components
export const LazyPAMAnalyticsDashboard = lazy(() => import('./PAMAnalyticsDashboard'));
export const LazyReportsAnalytics = lazy(() => import('./ReportsAnalytics'));
export const LazyUserManagement = lazy(() => import('./UserManagement'));
export const LazyTripTemplateManagement = lazy(() => import('./TripTemplateManagement'));
export const LazyTripScraperControl = lazy(() => import('./TripScraperControl'));
export const LazyObservabilityDashboard = lazy(() => import('./observability/ObservabilityDashboard'));
export const LazyDataCollectorMonitor = lazy(() => import('./DataCollectorMonitor'));
export const LazyTestingDashboard = lazy(() => import('./TestingDashboard'));
export const LazyShopManagement = lazy(() => import('./ShopManagement'));
export const LazyContentModeration = lazy(() => import('./ContentModeration'));
export const LazyUserFeedback = lazy(() => import('./UserFeedback'));
export const LazySupportTickets = lazy(() => import('./SupportTickets'));
export const LazyLearningDashboard = lazy(() => import('./LearningDashboard'));
export const LazySettings = lazy(() => import('./Settings'));
export const LazyPerformanceTestPage = lazy(() => import('../../pages/PerformanceTestPage'));

// Loading component for admin sections
const AdminSectionLoader = ({ section }: { section: string }) => (
  <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <p className="text-sm text-gray-600">Loading {section}...</p>
    </div>
  </div>
);

// HOC for wrapping lazy components with Suspense
export const withLazyLoading = <P extends object>(
  Component: React.LazyExoticComponent<React.ComponentType<P>>,
  sectionName: string
) => {
  return (props: P) => (
    <Suspense fallback={<AdminSectionLoader section={sectionName} />}>
      <Component {...props} />
    </Suspense>
  );
};

// Pre-wrapped components ready to use
export const PAMAnalyticsDashboard = withLazyLoading(LazyPAMAnalyticsDashboard, "PAM Analytics");
export const ReportsAnalytics = withLazyLoading(LazyReportsAnalytics, "Reports & Analytics");
export const UserManagement = withLazyLoading(LazyUserManagement, "User Management");
export const TripTemplateManagement = withLazyLoading(LazyTripTemplateManagement, "Trip Templates");
export const TripScraperControl = withLazyLoading(LazyTripScraperControl, "Trip Scraper");
export const ObservabilityDashboard = withLazyLoading(LazyObservabilityDashboard, "Observability");
export const DataCollectorMonitor = withLazyLoading(LazyDataCollectorMonitor, "Data Collector");
export const TestingDashboard = withLazyLoading(LazyTestingDashboard, "Testing");
export const ShopManagement = withLazyLoading(LazyShopManagement, "Shop Management");
export const ContentModeration = withLazyLoading(LazyContentModeration, "Content Moderation");
export const UserFeedback = withLazyLoading(LazyUserFeedback, "User Feedback");
export const SupportTickets = withLazyLoading(LazySupportTickets, "Support Tickets");
export const LearningDashboard = withLazyLoading(LazyLearningDashboard, "Learning Dashboard");
export const Settings = withLazyLoading(LazySettings, "Settings");
export const PerformanceTestPage = withLazyLoading(LazyPerformanceTestPage, "Performance Test");