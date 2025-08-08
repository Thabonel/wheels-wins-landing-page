/**
 * TypeScript types for PAM Visual Control System
 */

export interface VisualCommand {
  type: 'navigate' | 'fill_form' | 'click' | 'scroll' | 'highlight';
  target?: string;
  data?: FormData;
  description: string;
  options?: CommandOptions;
}

export interface CommandOptions {
  timeout?: number;
  retryCount?: number;
  waitAfter?: number;
  requireConfirmation?: boolean;
}

export interface FormData {
  [fieldName: string]: string | number | boolean;
}

export interface NavigationAction {
  route: string;
  state?: Record<string, unknown>;
  description: string;
}

export interface AppointmentDetails {
  person: string;
  date: string;
  time: string;
  location?: string;
  notes?: string;
}

export interface ExpenseDetails {
  amount: number;
  category: ExpenseCategory;
  description?: string;
  date?: string;
  receipt?: string;
}

export type ExpenseCategory = 
  | 'fuel' 
  | 'food' 
  | 'maintenance' 
  | 'camping' 
  | 'entertainment' 
  | 'supplies' 
  | 'other';

export interface VisualAction {
  action: string;
  parameters: Record<string, unknown>;
}

export interface PamVisualAction {
  type: 'visual_action';
  action: VisualAction;
  feedback_message?: string;
  timestamp?: string;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  error?: Error;
  duration?: number;
}

export interface QueueMetrics {
  queueSize: number;
  processing: boolean;
  currentAction: VisualCommand | null;
  completedCount: number;
  failedCount: number;
}

export interface VisualFeedbackOptions {
  showTooltip?: boolean;
  showHighlight?: boolean;
  animationDuration?: number;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

export interface DOMCleanupTracker {
  elements: WeakSet<Element>;
  timeouts: Set<NodeJS.Timeout>;
  intervals: Set<NodeJS.Timeout>;
}