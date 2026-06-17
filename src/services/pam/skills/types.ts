export interface PamSkill {
  id: string;
  name: string;
  description: string;
  category: PamSkillCategory;
  trigger_phrases: string[];
  required_context: string[];
  allowed_actions: string[];
  output_format: 'markdown' | 'text' | 'json';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PamSkillCategory = 'trip' | 'finance' | 'fuel' | 'vehicle' | 'summary' | 'safety' | 'resources';

export interface PamSkillUsageLog {
  id: string;
  user_id: string;
  skill_id: string;
  input_summary: string;
  output_summary: string;
  success: boolean;
  error_message?: string;
  created_at: string;
}

export interface PamAutomation {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  schedule_type: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'one_time';
  schedule_value: string;
  timezone: string;
  skill_id?: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PamMemoryPreference {
  id: string;
  user_id: string;
  category: MemoryPreferenceCategory;
  preference_key: string;
  preference_value: Record<string, unknown>;
  confidence: number;
  source: 'explicit' | 'inferred' | 'system' | 'user';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type MemoryPreferenceCategory =
  | 'region'
  | 'vehicle_type'
  | 'travel_style'
  | 'fuel_preference'
  | 'budget_goals'
  | 'regular_expenses'
  | 'preferred_camping_style'
  | 'accessibility_needs'
  | 'trip_planning_preferences'
  | 'income_interests'
  | 'communication_preferences'
  | 'conversation_summary'
  | 'task_reminder'
  | 'skill_usage_history';

export interface SkillMatchResult {
  skill: PamSkill;
  confidence: number;
  matchedPhrases: string[];
}

export interface SpecialistContext {
  userId: string;
  region?: string;
  vehicleType?: string;
  travelStyle?: string;
  fuelPreference?: string;
  budgetGoals?: Record<string, unknown>;
  regularExpenses?: Record<string, unknown>;
  preferredCampingStyle?: string;
  accessibilityNeeds?: string;
  tripPlanningPreferences?: Record<string, unknown>;
  incomeInterests?: string;
  token?: string;
}

export interface SpecialistResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  suggestions?: string[];
  error?: string;
}
