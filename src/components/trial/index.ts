/**
 * Trial Components - 28-day free trial system with habit-building nudges
 * Centralized exports for all trial-related UI components
 */

export { TrialProvider, useTrial } from '@/context/TrialContext';
export { TrialBanner } from './TrialBanner';
export { MilestonesCard } from './MilestonesCard';
export { TrialModal } from './TrialModal';
export { TrialLimits } from './TrialLimits';
export { UpgradePrompt } from './UpgradePrompt';

// Re-export types from service for convenience
export type {
  TrialInfo,
  TrialStatus,
  MilestoneType,
  LimitType,
  TrialEventType
} from '@/services/trialService';