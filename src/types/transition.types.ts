// Life Transition Navigator Module - TypeScript Types
// Matches database schema: docs/sql-fixes/100_transition_module.sql

// ============================================================================
// ENUMS (from database CHECK constraints)
// ============================================================================

export type TransitionPhase = 'planning' | 'preparing' | 'launching' | 'on_road';

export type TransitionType =
  | 'full_time'
  | 'part_time'
  | 'seasonal'
  | 'exploring';

export type TaskCategory =
  | 'financial'
  | 'vehicle'
  | 'life'
  | 'downsizing'
  | 'equipment'
  | 'legal'
  | 'social'
  | 'custom';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type MilestoneType =
  | 'planning_start'
  | 'three_months'
  | 'one_month'
  | 'one_week'
  | 'departure'
  | 'first_night'
  | 'one_month_road'
  | 'custom';

export type FinancialBucketType = 'transition' | 'emergency' | 'travel';

// ============================================================================
// CORE DATABASE TYPES
// ============================================================================

export interface TransitionProfile {
  id: string;
  user_id: string;

  // Core transition data
  departure_date: string; // ISO date string
  current_phase: TransitionPhase;
  transition_type: TransitionType;
  motivation: string | null;
  concerns: string[]; // JSONB array

  // Settings
  is_enabled: boolean;
  auto_hide_after_departure: boolean;
  hide_days_after_departure: number;

  // Progress tracking
  completion_percentage: number; // 0-100
  last_milestone_reached: string | null;

  // Timestamps
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  archived_at: string | null; // ISO timestamp
}

export interface TransitionTask {
  id: string;
  profile_id: string;
  user_id: string;

  // Task details
  title: string;
  description: string | null;
  category: TaskCategory;

  // Task properties
  is_system_task: boolean;
  priority: TaskPriority;

  // Completion
  is_completed: boolean;
  completed_at: string | null; // ISO timestamp

  // Dependencies
  depends_on_task_ids: string[]; // UUID array
  blocks_task_ids: string[]; // UUID array

  // Timeline
  milestone: string | null;
  days_before_departure: number | null;

  // Checklist items (sub-tasks)
  checklist_items: ChecklistItem[];

  // Timestamps
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface ChecklistItem {
  id: string;
  text: string;
  is_completed: boolean;
}

export interface TransitionTimeline {
  id: string;
  profile_id: string;
  user_id: string;

  // Milestone details
  milestone_type: MilestoneType;
  milestone_name: string;
  milestone_date: string; // ISO date string

  // Completion
  is_completed: boolean;
  completed_at: string | null; // ISO timestamp

  // Celebration
  celebration_message: string | null;
  tasks_associated_count: number;

  // System vs custom
  is_system_milestone: boolean;

  // Timestamps
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface TransitionFinancial {
  id: string;
  profile_id: string;
  user_id: string;

  // Bucket classification
  bucket_type: FinancialBucketType;
  category: string;
  subcategory: string | null;

  // Amounts
  estimated_amount: number;
  current_amount: number;

  // Auto-calculated fields (from database GENERATED ALWAYS AS)
  is_funded: boolean;
  funding_percentage: number; // 0-100

  // Additional metadata
  priority: TaskPriority;
  notes: string | null;
  due_date: string | null; // ISO date string

  // Timestamps
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// ============================================================================
// FUTURE DATABASE TYPES (not yet implemented)
// ============================================================================

export interface TransitionInventory {
  id: string;
  profile_id: string;
  user_id: string;

  room: string;
  item_name: string;
  decision: 'keep' | 'sell' | 'donate' | 'trash' | 'undecided';
  category: string;
  estimated_value: number | null;
  actual_value: number | null;

  is_sold: boolean;
  is_donated: boolean;
  notes: string | null;

  created_at: string;
  updated_at: string;
}

export interface TransitionEquipment {
  id: string;
  profile_id: string;
  user_id: string;

  equipment_category: string;
  equipment_name: string;
  priority: TaskPriority;

  estimated_cost: number;
  actual_cost: number | null;

  is_acquired: boolean;
  acquired_at: string | null;

  purchase_link: string | null;
  notes: string | null;

  created_at: string;
  updated_at: string;
}

export interface TransitionVehicle {
  id: string;
  profile_id: string;
  user_id: string;

  vehicle_type: string;
  vehicle_name: string;

  modification_type: string;
  modification_description: string;
  priority: TaskPriority;

  estimated_cost: number;
  actual_cost: number | null;

  is_completed: boolean;
  completed_at: string | null;

  vendor: string | null;
  notes: string | null;

  created_at: string;
  updated_at: string;
}

export interface TransitionCommunity {
  id: string;
  profile_id: string;
  user_id: string;

  buddy_user_id: string | null;
  buddy_name: string;
  buddy_contact: string | null;

  relationship_type: 'mentor' | 'accountability' | 'friend' | 'family';
  connection_status: 'pending' | 'active' | 'inactive';

  last_contact_date: string | null;
  notes: string | null;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

// Profile API
export interface CreateTransitionProfileRequest {
  departure_date: string; // ISO date string
  transition_type: TransitionType;
  motivation?: string;
  concerns?: string[];
}

export interface UpdateTransitionProfileRequest {
  departure_date?: string;
  current_phase?: TransitionPhase;
  transition_type?: TransitionType;
  motivation?: string;
  concerns?: string[];
  is_enabled?: boolean;
  auto_hide_after_departure?: boolean;
  hide_days_after_departure?: number;
}

export interface TransitionProfileResponse {
  profile: TransitionProfile;
  stats: {
    total_tasks: number;
    completed_tasks: number;
    total_milestones: number;
    completed_milestones: number;
    days_until_departure: number;
    total_estimated_cost: number;
    total_funded: number;
    funding_percentage: number;
  };
}

// Task API
export interface CreateTaskRequest {
  title: string;
  description?: string;
  category: TaskCategory;
  priority?: TaskPriority;
  milestone?: string;
  days_before_departure?: number;
  checklist_items?: Omit<ChecklistItem, 'id'>[];
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  category?: TaskCategory;
  priority?: TaskPriority;
  is_completed?: boolean;
  milestone?: string;
  days_before_departure?: number;
  checklist_items?: ChecklistItem[];
  depends_on_task_ids?: string[];
  blocks_task_ids?: string[];
}

export interface TasksListResponse {
  tasks: TransitionTask[];
  total: number;
  by_category: Record<TaskCategory, number>;
  by_priority: Record<TaskPriority, number>;
}

// Timeline API
export interface CreateMilestoneRequest {
  milestone_type: MilestoneType;
  milestone_name: string;
  milestone_date: string; // ISO date string
  celebration_message?: string;
}

export interface UpdateMilestoneRequest {
  milestone_name?: string;
  milestone_date?: string;
  is_completed?: boolean;
  celebration_message?: string;
}

export interface TimelineResponse {
  milestones: TransitionTimeline[];
  next_milestone: TransitionTimeline | null;
  days_until_next: number | null;
}

// Financial API
export interface CreateFinancialItemRequest {
  bucket_type: FinancialBucketType;
  category: string;
  subcategory?: string;
  estimated_amount: number;
  current_amount?: number;
  priority?: TaskPriority;
  notes?: string;
  due_date?: string; // ISO date string
}

export interface UpdateFinancialItemRequest {
  category?: string;
  subcategory?: string;
  estimated_amount?: number;
  current_amount?: number;
  priority?: TaskPriority;
  notes?: string;
  due_date?: string;
}

export interface FinancialBucketsResponse {
  buckets: {
    transition: BucketSummary;
    emergency: BucketSummary;
    travel: BucketSummary;
  };
  total_estimated: number;
  total_funded: number;
  total_funding_percentage: number;
  items: TransitionFinancial[];
}

export interface BucketSummary {
  bucket_type: FinancialBucketType;
  total_estimated: number;
  total_funded: number;
  funding_percentage: number;
  items_count: number;
  by_category: Record<string, {
    estimated: number;
    funded: number;
    percentage: number;
  }>;
}

// ============================================================================
// UI COMPONENT TYPES
// ============================================================================

export interface DashboardStats {
  days_until_departure: number;
  current_phase: TransitionPhase;
  completion_percentage: number;
  tasks_completed: number;
  tasks_total: number;
  milestones_completed: number;
  milestones_total: number;
  financial_readiness: number; // 0-100
  priority_tasks: TransitionTask[];
  upcoming_milestones: TransitionTimeline[];
}

export interface TaskFilters {
  category?: TaskCategory;
  priority?: TaskPriority;
  is_completed?: boolean;
  search?: string;
}

export interface TimelineFilters {
  milestone_type?: MilestoneType;
  is_completed?: boolean;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface FinancialFilters {
  bucket_type?: FinancialBucketType;
  category?: string;
  is_funded?: boolean;
  priority?: TaskPriority;
}

// ============================================================================
// PAM INTEGRATION TYPES
// ============================================================================

export interface PAMTransitionContext {
  has_transition_profile: boolean;
  profile?: TransitionProfile;
  days_until_departure?: number;
  current_phase?: TransitionPhase;
  completion_percentage?: number;
  priority_tasks?: TransitionTask[];
  financial_readiness?: number;
}

export interface PAMTransitionToolResponse {
  success: boolean;
  message: string;
  data?: any;
  ui_action?: {
    type: 'navigate' | 'highlight' | 'open_modal' | 'show_celebration';
    payload: any;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: ValidationError[];
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface TransitionProfileFormData {
  departure_date: Date;
  transition_type: TransitionType;
  motivation: string;
  concerns: string[];
}

export interface TaskFormData {
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  milestone: string;
  days_before_departure: number | null;
  checklist_items: Omit<ChecklistItem, 'id'>[];
}

export interface MilestoneFormData {
  milestone_type: MilestoneType;
  milestone_name: string;
  milestone_date: Date;
  celebration_message: string;
}

export interface FinancialItemFormData {
  bucket_type: FinancialBucketType;
  category: string;
  subcategory: string;
  estimated_amount: number;
  current_amount: number;
  priority: TaskPriority;
  notes: string;
  due_date: Date | null;
}

// ============================================================================
// ROOM INVENTORY TYPES (STAGE 2)
// ============================================================================

// Room types
export type RoomType = 'living_room' | 'bedroom' | 'kitchen' | 'bathroom' | 'garage' | 'storage' | 'office' | 'other' | 'custom';
export type RoomStatus = 'not_started' | 'in_progress' | 'completed';

// Item decision types
export type ItemDecision = 'keep' | 'sell' | 'donate' | 'store' | 'trash' | 'parking_lot';

// Room entity
export interface TransitionRoom {
  id: string;
  profile_id: string;
  user_id: string;

  name: string;
  room_type: RoomType;
  status: RoomStatus;

  total_items: number;
  decided_items: number;
  completion_percentage: number;

  created_at: string;
  updated_at: string;
}

// Item entity
export interface TransitionItem {
  id: string;
  room_id: string;
  profile_id: string;
  user_id: string;

  name: string;
  description: string | null;
  category: string | null;

  decision: ItemDecision | null;
  decision_date: string | null;

  estimated_value: number | null;
  emotional_difficulty: number | null; // 1-5 stars
  photo_url: string | null;
  notes: string | null;

  created_at: string;
  updated_at: string;
}

// Room API types
export interface CreateRoomRequest {
  name: string;
  room_type: RoomType;
}

export interface UpdateRoomRequest {
  name?: string;
  room_type?: RoomType;
  status?: RoomStatus;
}

// Item API types
export interface CreateItemRequest {
  room_id: string;
  name: string;
  description?: string;
  category?: string;
  estimated_value?: number;
  emotional_difficulty?: number;
  photo_url?: string;
  notes?: string;
}

export interface UpdateItemRequest {
  name?: string;
  description?: string;
  category?: string;
  decision?: ItemDecision;
  estimated_value?: number;
  emotional_difficulty?: number;
  photo_url?: string;
  notes?: string;
}

// Downsizing stats
export interface DownsizingStats {
  total_rooms: number;
  completed_rooms: number;
  total_items: number;
  decided_items: number;
  keep_count: number;
  sell_count: number;
  donate_count: number;
  store_count: number;
  trash_count: number;
  parking_lot_count: number;
  estimated_sale_value: number;
  overall_completion: number;
}

// Room detail response
export interface RoomDetailResponse {
  room: TransitionRoom;
  items: TransitionItem[];
  stats: {
    keep_count: number;
    sell_count: number;
    donate_count: number;
    store_count: number;
    trash_count: number;
    parking_lot_count: number;
    estimated_sale_value: number;
  };
}

// ============================================================================
// DIGITAL LIFE MANAGEMENT TYPES (Prompt 2.2)
// ============================================================================

// Service types
export type ServiceType = 'cancellation' | 'consolidation' | 'digitization';
export type ServiceStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type ConsolidationStatus = 'pending' | 'in_progress' | 'completed';
export type ServicePriority = 'low' | 'medium' | 'high' | 'critical';

// Service entity
export interface TransitionService {
  id: string;
  profile_id: string;
  user_id: string;
  service_type: ServiceType;

  // Service details
  service_name: string;
  category: string;
  provider: string | null;
  account_number: string | null;

  // Cancellation fields
  cancellation_target_date: string | null;
  cancellation_completed: boolean;
  cancellation_completed_date: string | null;

  // Consolidation fields
  old_account_info: string | null;
  new_account_info: string | null;
  consolidation_status: ConsolidationStatus | null;

  // Digitization fields
  documents_total: number;
  documents_scanned: number;
  storage_location: string | null;

  // Common fields
  status: ServiceStatus;
  priority: ServicePriority;
  notes: string | null;

  created_at: string;
  updated_at: string;
}

// Service create request
export interface CreateServiceRequest {
  service_type: ServiceType;
  service_name: string;
  category: string;
  provider?: string;
  account_number?: string;
  cancellation_target_date?: string;
  old_account_info?: string;
  new_account_info?: string;
  documents_total?: number;
  priority?: ServicePriority;
  notes?: string;
}

// Service update request
export interface UpdateServiceRequest {
  service_name?: string;
  category?: string;
  provider?: string;
  account_number?: string;
  cancellation_target_date?: string;
  cancellation_completed?: boolean;
  old_account_info?: string;
  new_account_info?: string;
  consolidation_status?: ConsolidationStatus;
  documents_total?: number;
  documents_scanned?: number;
  storage_location?: string;
  status?: ServiceStatus;
  priority?: ServicePriority;
  notes?: string;
}

// Service statistics
export interface ServiceStats {
  total_cancellations: number;
  completed_cancellations: number;
  pending_cancellations: number;
  total_consolidations: number;
  completed_consolidations: number;
  pending_consolidations: number;
  total_digitizations: number;
  documents_scanned: number;
  documents_total: number;
  digitization_percentage: number;
}

// ============================================================================
// INCOME STREAMS (Prompt 2.3)
// ============================================================================

// Income stream types
export type IncomeType = 'remote_work' | 'freelance' | 'passive' | 'seasonal';
export type IncomeStatus = 'planning' | 'setting_up' | 'active' | 'paused' | 'discontinued';
export type IncomePriority = 'low' | 'medium' | 'high' | 'critical';

// Checklist item structure
export interface ChecklistItem {
  task: string;
  completed: boolean;
}

// Resource link structure
export interface ResourceLink {
  title: string;
  url: string;
}

// Income stream entity
export interface IncomeStream {
  id: string;
  profile_id: string;
  user_id: string;

  // Stream details
  stream_name: string;
  income_type: IncomeType;

  // Financial projections
  monthly_estimate: number;
  actual_monthly: number;

  // Status tracking
  status: IncomeStatus;

  // Setup progress
  setup_checklist: ChecklistItem[];
  setup_completed: boolean;
  setup_completed_date: string | null;

  // Resources and notes
  resources: ResourceLink[];
  notes: string | null;

  // Priority
  priority: IncomePriority;

  // Timestamps
  created_at: string;
  updated_at: string;
  started_at: string | null;
  discontinued_at: string | null;
}

// Income stream create request
export interface CreateIncomeStreamRequest {
  stream_name: string;
  income_type: IncomeType;
  monthly_estimate?: number;
  status?: IncomeStatus;
  setup_checklist?: ChecklistItem[];
  resources?: ResourceLink[];
  notes?: string;
  priority?: IncomePriority;
}

// Income stream update request
export interface UpdateIncomeStreamRequest {
  stream_name?: string;
  income_type?: IncomeType;
  monthly_estimate?: number;
  actual_monthly?: number;
  status?: IncomeStatus;
  setup_checklist?: ChecklistItem[];
  setup_completed?: boolean;
  resources?: ResourceLink[];
  notes?: string;
  priority?: IncomePriority;
}

// Income stream statistics
export interface IncomeStats {
  total_streams: number;
  active_streams: number;
  total_monthly_estimate: number;
  total_actual_monthly: number;
  remote_work_count: number;
  freelance_count: number;
  passive_count: number;
  seasonal_count: number;
  setup_completion_percentage: number;
}
