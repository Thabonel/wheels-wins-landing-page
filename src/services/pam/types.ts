/**
 * TypeScript types for PAM System - Phase 6 Learning & Intelligence
 * Includes Visual Control System, Learning System, and Proactive Assistant types
 */

// Phase 6: Learning System Types
export interface UserFeedback {
  rating: number; // 1-5 scale
  comment?: string;
  helpful: boolean;
  category?: 'accuracy' | 'helpfulness' | 'speed' | 'relevance';
  timestamp: number;
}

export interface FeedbackScore {
  overall: number;
  accuracy: number;
  helpfulness: number;
  speed: number;
  relevance: number;
}

export interface LearningMetrics {
  averageRating: number;
  totalInteractions: number;
  recentFeedbackCount: number;
  averageResponseTime: number;
  highSatisfactionCount: number;
  lowSatisfactionCount: number;
  lastUpdated: number;
  confidenceScore: number;
  satisfactionRate?: number;
  improvementTrend?: number;
  reliabilityScore?: number;
}

export interface LearningEvent {
  type: 'feedback_processed' | 'confidence_updated' | 'pattern_detected';
  interactionId: string;
  agentType: string;
  feedbackScore: number;
  confidence: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

// Phase 6: Proactive Assistant Types
export interface ProactiveInsight {
  id: string;
  type: 'weather_alert' | 'budget_alert' | 'trip_suggestion' | 'maintenance_reminder' | 'community_activity' | 'seasonal_suggestion';
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  title: string;
  message: string;
  actionable: boolean;
  actions?: InsightAction[];
  data: Record<string, any>;
  source: string;
  timestamp: number;
  expiresAt: number;
}

export interface InsightAction {
  label: string;
  action: string;
  data: Record<string, any>;
}

export interface UserContext {
  userId: string;
  currentLocation: string;
  travelPatterns: TravelPattern;
  budgetPatterns: BudgetPattern;
  socialPatterns: any;
  preferences: any;
  conversationContext: ConversationContext;
  vehicleData?: VehicleData;
  lastActive: number;
}

export interface TravelPattern {
  totalTrips: number;
  favoriteDestinations: string[];
  averageTripLength: number;
  seasonalPreferences: any;
  upcomingTrips: any[];
  soloTravelFrequency: number;
}

export interface BudgetPattern {
  monthlyBudget: number;
  monthlySpending: number;
  budgetConcerns: string[];
  spendingCategories: any;
}

export interface WeatherAlert {
  type: string;
  severity: 'low' | 'moderate' | 'high' | 'severe';
  description: string;
  affectedAreas: string[];
  startTime: number;
  endTime: number;
}

export interface MaintenanceReminder {
  type: 'service' | 'inspection' | 'tire_rotation' | 'oil_change';
  dueDate: number;
  milesDue: number;
  currentMiles: number;
  description: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface CommunityActivity {
  id: string;
  type: 'meetup' | 'event' | 'group_trip';
  title: string;
  description: string;
  location: string;
  date: number;
  participants: number;
  maxParticipants?: number;
}

export interface VehicleData {
  id: string;
  make: string;
  model: string;
  year: number;
  milesSinceLastService: number;
  lastServiceDate: number;
  nextServiceDue: number;
}

// Existing Visual Control Types
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