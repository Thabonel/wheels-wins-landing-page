/**
 * PAM Context Manager - Intelligent Context Orchestration
 * 
 * Features:
 * - Loads user context on initialization (preferences, recent memories, active trip, budget)
 * - Enriches each message with relevant context
 * - Maintains conversation continuity across sessions
 * - Implements smart context switching based on current page/activity
 * - Integrates with memory service and WebSocket connection
 * - Proactive context updates based on user behavior
 */

import { supabase } from '@/integrations/supabase/client';
import { PAMMemoryService, type Memory, type UserPreference } from './memoryService';
import type { PamMessage } from '@/hooks/pam/usePamWebSocketCore';

// Context Types
export interface UserContext {
  userId: string;
  sessionId: string;
  conversationId?: string;
  
  // User Profile & Preferences
  userProfile: {
    name?: string;
    email?: string;
    avatar_url?: string;
    timezone?: string;
    locale?: string;
  };
  preferences: UserPreference[];
  
  // Current State
  currentPage: string;
  currentActivity: 'trip_planning' | 'expense_tracking' | 'social' | 'general' | 'unknown';
  
  // Active Data
  activeTrip?: TripContext;
  budgetStatus?: BudgetContext;
  recentExpenses?: ExpenseContext[];
  
  // Memory & Learning
  recentMemories: Memory[];
  relevantMemories: Memory[];
  
  // Temporal Context
  timestamp: Date;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  
  // Device & Environment
  deviceType: 'mobile' | 'desktop' | 'tablet';
  isOnline: boolean;
  
  // Conversation State
  conversationHistory: PamMessage[];
  lastInteraction?: Date;
  
  // Metadata
  contextVersion: string;
  loadTime?: number;
}

export interface TripContext {
  id: string;
  title: string;
  status: 'planning' | 'active' | 'completed';
  start_date?: string;
  end_date?: string;
  origin?: LocationContext;
  destination?: LocationContext;
  waypoints?: LocationContext[];
  vehicle_info?: any;
  budget_allocated?: number;
  participants?: any[];
  preferences?: any;
}

export interface BudgetContext {
  currentMonth: {
    allocated: number;
    spent: number;
    remaining: number;
    categories: { [key: string]: { allocated: number; spent: number } };
  };
  recentTrend: 'increasing' | 'decreasing' | 'stable';
  alerts: string[];
  savingsGoalProgress?: number;
}

export interface ExpenseContext {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  location?: string;
  trip_id?: string;
}

export interface LocationContext {
  name: string;
  coordinates?: [number, number];
  type?: 'city' | 'campground' | 'poi' | 'address';
  metadata?: any;
}

export interface ContextEnrichmentOptions {
  includeRecentMemories?: boolean;
  memoryLookbackHours?: number;
  includeRelevantMemories?: boolean;
  maxRelevantMemories?: number;
  includeActiveData?: boolean;
  includePreferences?: boolean;
  refreshThreshold?: number; // Minutes before refreshing context
  enableBackendIntentClassification?: boolean; // Use enhanced backend intent classification
}

export interface MessageEnrichment {
  originalMessage: PamMessage;
  enrichedContent: {
    userIntent: string;
    contextClues: string[];
    relevantMemories: Memory[];
    applicablePreferences: UserPreference[];
    suggestedActions: string[];
    confidence: number;
  };
  processingTime: number;
}

export class PAMContextManager {
  private memoryService: PAMMemoryService;
  private currentContext: UserContext | null = null;
  private contextCache: Map<string, any> = new Map();
  private readonly CONTEXT_CACHE_TTL = 300000; // 5 minutes
  private refreshTimeout: NodeJS.Timeout | null = null;

  constructor(
    private userId: string,
    private options: ContextEnrichmentOptions = {}
  ) {
    this.memoryService = new PAMMemoryService(userId);
    
    // Default options
    this.options = {
      includeRecentMemories: true,
      memoryLookbackHours: 24,
      includeRelevantMemories: true,
      maxRelevantMemories: 5,
      includeActiveData: true,
      includePreferences: true,
      refreshThreshold: 15,
      ...options
    };
  }

  // =====================================================
  // CONTEXT INITIALIZATION & MANAGEMENT
  // =====================================================

  /**
   * Initialize user context with full data loading
   */
  async initializeContext(conversationId?: string): Promise<UserContext> {
    const startTime = Date.now();
    console.log('🔄 Initializing PAM context for user:', this.userId);

    try {
      // Load all context data in parallel for performance
      const [
        userProfile,
        preferences,
        activeTrip,
        budgetStatus,
        recentExpenses,
        recentMemories,
        conversationHistory
      ] = await Promise.all([
        this.loadUserProfile(),
        this.loadUserPreferences(),
        this.loadActiveTrip(),
        this.loadBudgetStatus(),
        this.loadRecentExpenses(),
        this.loadRecentMemories(),
        this.loadConversationHistory(conversationId)
      ]);

      // Determine current context
      const currentPage = this.getCurrentPage();
      const currentActivity = this.inferCurrentActivity(currentPage);
      const deviceType = this.detectDeviceType();
      const timeContext = this.getTimeContext();

      // Build context object
      this.currentContext = {
        userId: this.userId,
        sessionId: this.generateSessionId(),
        conversationId,
        
        userProfile,
        preferences,
        
        currentPage,
        currentActivity,
        
        activeTrip,
        budgetStatus,
        recentExpenses,
        
        recentMemories,
        relevantMemories: [], // Will be populated per message
        
        timestamp: new Date(),
        timeOfDay: timeContext.timeOfDay,
        dayOfWeek: timeContext.dayOfWeek,
        
        deviceType,
        isOnline: navigator.onLine,
        
        conversationHistory,
        lastInteraction: conversationHistory.length > 0 
          ? new Date(conversationHistory[conversationHistory.length - 1].timestamp)
          : undefined,
        
        contextVersion: '2.0',
        loadTime: Date.now() - startTime
      };

      // Learn context loading pattern
      await this.memoryService.recordIntentPattern(
        'context_initialization',
        {
          page: currentPage,
          activity: currentActivity,
          time_of_day: timeContext.timeOfDay,
          load_time_ms: this.currentContext.loadTime
        }
      );

      // Schedule periodic refresh
      this.scheduleContextRefresh();

      console.log(`✅ Context initialized in ${this.currentContext.loadTime}ms`);
      return this.currentContext;
    } catch (error) {
      console.error('Error initializing context:', error);
      
      // Return minimal fallback context
      this.currentContext = this.createFallbackContext();
      return this.currentContext;
    }
  }

  /**
   * Enrich a message with relevant context
   */
  async enrichMessage(message: PamMessage): Promise<MessageEnrichment> {
    const startTime = Date.now();
    
    if (!this.currentContext) {
      await this.initializeContext();
    }

    try {
      // Analyze user intent from message
      const userIntent = await this.analyzeUserIntent(message);
      
      // Find relevant memories based on message content
      const relevantMemories = await this.findRelevantMemories(
        message.message || message.content || '',
        userIntent
      );

      // Get applicable preferences
      const applicablePreferences = this.getApplicablePreferences(userIntent);

      // Extract context clues
      const contextClues = this.extractContextClues(message);

      // Suggest possible actions
      const suggestedActions = await this.suggestActions(
        userIntent,
        relevantMemories,
        contextClues
      );

      // Calculate confidence based on available context
      const confidence = this.calculateContextConfidence(
        relevantMemories,
        applicablePreferences,
        contextClues
      );

      // Update relevant memories in context
      this.currentContext!.relevantMemories = relevantMemories;

      const enrichment: MessageEnrichment = {
        originalMessage: message,
        enrichedContent: {
          userIntent,
          contextClues,
          relevantMemories,
          applicablePreferences,
          suggestedActions,
          confidence
        },
        processingTime: Date.now() - startTime
      };

      // Learn from this enrichment
      await this.learnFromEnrichment(enrichment);

      console.log(`💎 Message enriched in ${enrichment.processingTime}ms (confidence: ${confidence})`);
      return enrichment;
    } catch (error) {
      console.error('Error enriching message:', error);
      
      // Return minimal enrichment
      return {
        originalMessage: message,
        enrichedContent: {
          userIntent: 'unknown',
          contextClues: [],
          relevantMemories: [],
          applicablePreferences: [],
          suggestedActions: [],
          confidence: 0.1
        },
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Update context based on page/activity change
   */
  async switchContext(newPage: string, additionalData?: any): Promise<void> {
    if (!this.currentContext) return;

    const oldActivity = this.currentContext.currentActivity;
    const newActivity = this.inferCurrentActivity(newPage);

    // Update current context
    this.currentContext.currentPage = newPage;
    this.currentContext.currentActivity = newActivity;
    this.currentContext.timestamp = new Date();

    // If activity changed significantly, refresh active data
    if (oldActivity !== newActivity) {
      console.log(`🔄 Context switch: ${oldActivity} → ${newActivity}`);
      
      // Reload relevant data for new activity
      await this.refreshContextForActivity(newActivity);
      
      // Learn context switching pattern
      await this.memoryService.recordIntentPattern(
        'context_switch',
        {
          from_activity: oldActivity,
          to_activity: newActivity,
          page: newPage,
          additional_data: additionalData
        }
      );
    }
  }

  /**
   * Refresh context data
   */
  async refreshContext(force: boolean = false): Promise<void> {
    if (!this.currentContext) return;

    const lastRefresh = this.currentContext.timestamp;
    const minutesSinceRefresh = (Date.now() - lastRefresh.getTime()) / 60000;

    if (!force && minutesSinceRefresh < (this.options.refreshThreshold || 15)) {
      return; // Too recent to refresh
    }

    console.log('🔄 Refreshing PAM context...');

    try {
      // Refresh active data that might have changed
      const [activeTrip, budgetStatus, recentExpenses] = await Promise.all([
        this.loadActiveTrip(),
        this.loadBudgetStatus(),
        this.loadRecentExpenses()
      ]);

      this.currentContext.activeTrip = activeTrip;
      this.currentContext.budgetStatus = budgetStatus;
      this.currentContext.recentExpenses = recentExpenses;
      this.currentContext.timestamp = new Date();
      this.currentContext.isOnline = navigator.onLine;

      console.log('✅ Context refreshed');
    } catch (error) {
      console.error('Error refreshing context:', error);
    }
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  private async loadUserProfile(): Promise<UserContext['userProfile']> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return {};

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      return {
        name: profile?.full_name || user.user_metadata?.full_name,
        email: user.email,
        avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: navigator.language
      };
    } catch (error) {
      console.error('Error loading user profile:', error);
      return {};
    }
  }

  private async loadUserPreferences(): Promise<UserPreference[]> {
    if (!this.options.includePreferences) return [];
    
    try {
      return await this.memoryService.getUserPreferences();
    } catch (error) {
      console.error('Error loading preferences:', error);
      return [];
    }
  }

  private async loadActiveTrip(): Promise<TripContext | undefined> {
    if (!this.options.includeActiveData) return undefined;

    try {
      // This would integrate with your trip planning system
      // For now, return a placeholder structure
      const cacheKey = `active_trip_${this.userId}`;
      if (this.contextCache.has(cacheKey)) {
        return this.contextCache.get(cacheKey);
      }

      // TODO: Implement actual trip loading logic
      // const { data } = await supabase...
      
      return undefined;
    } catch (error) {
      console.error('Error loading active trip:', error);
      return undefined;
    }
  }

  private async loadBudgetStatus(): Promise<BudgetContext | undefined> {
    if (!this.options.includeActiveData) return undefined;

    try {
      const cacheKey = `budget_status_${this.userId}`;
      if (this.contextCache.has(cacheKey)) {
        return this.contextCache.get(cacheKey);
      }

      // TODO: Implement actual budget loading logic
      // This would integrate with your expense tracking system
      
      return undefined;
    } catch (error) {
      console.error('Error loading budget status:', error);
      return undefined;
    }
  }

  private async loadRecentExpenses(): Promise<ExpenseContext[]> {
    if (!this.options.includeActiveData) return [];

    try {
      // TODO: Implement actual expense loading logic
      return [];
    } catch (error) {
      console.error('Error loading recent expenses:', error);
      return [];
    }
  }

  private async loadRecentMemories(): Promise<Memory[]> {
    if (!this.options.includeRecentMemories) return [];

    try {
      const hours = this.options.memoryLookbackHours || 24;
      const timeWindow = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      return await this.memoryService.searchMemories('', {
        timeWindow,
        maxResults: 20,
        similarityThreshold: 0.0 // Get all recent memories
      });
    } catch (error) {
      console.error('Error loading recent memories:', error);
      return [];
    }
  }

  private async loadConversationHistory(conversationId?: string): Promise<PamMessage[]> {
    if (!conversationId) return [];

    try {
      const { data, error } = await supabase
        .from('pam_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      return (data || []).map(msg => ({
        id: msg.id,
        type: msg.message_type || 'message',
        message: msg.content,
        content: msg.content,
        timestamp: new Date(msg.created_at).getTime(),
        metadata: msg.metadata || {}
      }));
    } catch (error) {
      console.error('Error loading conversation history:', error);
      return [];
    }
  }

  private async analyzeUserIntent(message: PamMessage): Promise<string> {
    const text = message.message || message.content || '';
    
    // Enhanced intent classification integrating with backend system
    try {
      // Try to use backend intent classification if available
      if (this.options.enableBackendIntentClassification) {
        const response = await fetch('/api/pam/classify-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAuthToken()}`
          },
          body: JSON.stringify({
            message: text,
            context: {
              current_page: this.currentContext?.currentPage,
              current_activity: this.currentContext?.currentActivity,
              user_id: this.currentContext?.userId
            }
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.classification) {
            return result.classification.intent;
          }
        }
      }
    } catch (error) {
      console.warn('Backend intent classification failed, using fallback:', error);
    }
    
    // Fallback to enhanced keyword-based classification
    const lowerText = text.toLowerCase();
    
    // Trip planning intents
    if (lowerText.includes('trip') || lowerText.includes('travel') || lowerText.includes('route') ||
        lowerText.includes('plan') || lowerText.includes('destination') || lowerText.includes('journey')) {
      return 'trip_planning';
    }
    
    // Expense tracking intents  
    if (lowerText.includes('spent') || lowerText.includes('cost') || lowerText.includes('expense') ||
        lowerText.includes('paid') || lowerText.includes('bought') || lowerText.includes('purchase')) {
      return 'expense_tracking';
    }
    
    // Budget management intents
    if (lowerText.includes('budget') || lowerText.includes('save') || lowerText.includes('afford') ||
        lowerText.includes('financial') || lowerText.includes('money') || lowerText.includes('limit')) {
      return 'budget_management';
    }
    
    // Campground search intents
    if (lowerText.includes('campground') || lowerText.includes('camping') || lowerText.includes('park') ||
        lowerText.includes('accommodation') || lowerText.includes('stay') || lowerText.includes('overnight')) {
      return 'campground_search';
    }
    
    // Weather inquiry intents
    if (lowerText.includes('weather') || lowerText.includes('forecast') || lowerText.includes('temperature') ||
        lowerText.includes('rain') || lowerText.includes('conditions')) {
      return 'weather_inquiry';
    }
    
    // Help request intents
    if (lowerText.includes('help') || lowerText.includes('how') || lowerText.includes('what') ||
        lowerText.includes('assist') || lowerText.includes('guide') || lowerText.includes('explain')) {
      return 'help_request';
    }
    
    // Recommendation request intents
    if (lowerText.includes('recommend') || lowerText.includes('suggest') || lowerText.includes('find') ||
        lowerText.includes('best') || lowerText.includes('good')) {
      return 'recommendation_request';
    }
    
    // Correction intents
    if (lowerText.includes('wrong') || lowerText.includes('incorrect') || lowerText.includes('mistake') ||
        lowerText.includes('actually') || lowerText.includes('correct')) {
      return 'correction';
    }
    
    // Use current activity as fallback
    return this.currentContext?.currentActivity || 'general_query';
  }

  private async findRelevantMemories(query: string, intent: string): Promise<Memory[]> {
    if (!this.options.includeRelevantMemories || !query.trim()) return [];

    try {
      const maxResults = this.options.maxRelevantMemories || 5;
      
      // Search for memories relevant to the query and intent
      const searchQuery = `${query} ${intent}`;
      return await this.memoryService.searchMemories(searchQuery, {
        maxResults,
        similarityThreshold: 0.7,
        memoryTypes: ['episodic', 'semantic'] // Exclude working memory for relevance
      });
    } catch (error) {
      console.error('Error finding relevant memories:', error);
      return [];
    }
  }

  private getApplicablePreferences(intent: string): UserPreference[] {
    if (!this.currentContext?.preferences) return [];

    // Filter preferences based on intent
    return this.currentContext.preferences.filter(pref => {
      switch (intent) {
        case 'trip_planning':
          return ['travel', 'vehicle', 'accommodation'].includes(pref.category);
        case 'expense_tracking':
          return ['budget', 'expense_categories'].includes(pref.category);
        default:
          return pref.confidence > 0.7; // High-confidence preferences for general queries
      }
    });
  }

  private extractContextClues(message: PamMessage): string[] {
    const clues: string[] = [];
    const text = (message.message || message.content || '').toLowerCase();

    // Location references
    if (/\b(to|from|in|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/.test(text)) {
      clues.push('location_reference');
    }

    // Time references
    if (/\b(today|tomorrow|yesterday|next week|this weekend)\b/.test(text)) {
      clues.push('time_reference');
    }

    // Current page context
    if (this.currentContext?.currentPage) {
      clues.push(`page:${this.currentContext.currentPage}`);
    }

    // Active data context
    if (this.currentContext?.activeTrip) {
      clues.push('active_trip');
    }

    return clues;
  }

  private async suggestActions(
    intent: string,
    memories: Memory[],
    contextClues: string[]
  ): Promise<string[]> {
    const actions: string[] = [];

    switch (intent) {
      case 'trip_planning':
        actions.push('show_map', 'calculate_route', 'find_campgrounds');
        break;
      case 'expense_tracking':
        actions.push('add_expense', 'view_budget', 'generate_report');
        break;
      case 'recommendation_request':
        actions.push('search_recommendations', 'show_similar_experiences');
        break;
    }

    // Add context-specific actions
    if (contextClues.includes('location_reference')) {
      actions.push('show_location_details');
    }

    return actions;
  }

  private calculateContextConfidence(
    memories: Memory[],
    preferences: UserPreference[],
    contextClues: string[]
  ): number {
    let confidence = 0.3; // Base confidence

    // Boost for relevant memories
    confidence += Math.min(0.3, memories.length * 0.1);

    // Boost for applicable preferences
    confidence += Math.min(0.2, preferences.length * 0.05);

    // Boost for context clues
    confidence += Math.min(0.2, contextClues.length * 0.04);

    return Math.min(1.0, confidence);
  }

  private async learnFromEnrichment(enrichment: MessageEnrichment): Promise<void> {
    try {
      // Store the enriched interaction as a memory
      await this.memoryService.storeMemory(
        {
          user_message: enrichment.originalMessage.message || enrichment.originalMessage.content,
          intent: enrichment.enrichedContent.userIntent,
          context_clues: enrichment.enrichedContent.contextClues,
          confidence: enrichment.enrichedContent.confidence,
          processing_time: enrichment.processingTime
        },
        'working', // Store as working memory initially
        {
          importance: enrichment.enrichedContent.confidence,
          context: {
            page: this.currentContext?.currentPage,
            activity: this.currentContext?.currentActivity,
            timestamp: new Date().toISOString()
          },
          tags: ['enrichment', enrichment.enrichedContent.userIntent],
          conversationId: this.currentContext?.conversationId
        }
      );

      // Learn preferences from high-confidence enrichments
      if (enrichment.enrichedContent.confidence > 0.8) {
        // This could be enhanced to extract specific preferences
        // from the enriched content
      }
    } catch (error) {
      console.error('Error learning from enrichment:', error);
    }
  }

  private getCurrentPage(): string {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  }

  private inferCurrentActivity(page: string): UserContext['currentActivity'] {
    if (page.includes('/wheels') || page.includes('/trip')) {
      return 'trip_planning';
    }
    if (page.includes('/wins') || page.includes('/expense') || page.includes('/budget')) {
      return 'expense_tracking';
    }
    if (page.includes('/social') || page.includes('/community')) {
      return 'social';
    }
    return 'general';
  }

  private detectDeviceType(): 'mobile' | 'desktop' | 'tablet' {
    if (typeof window === 'undefined') return 'desktop';
    
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private getTimeContext(): { timeOfDay: UserContext['timeOfDay']; dayOfWeek: string } {
    const now = new Date();
    const hour = now.getHours();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    let timeOfDay: UserContext['timeOfDay'];
    if (hour < 6) timeOfDay = 'night';
    else if (hour < 12) timeOfDay = 'morning';
    else if (hour < 18) timeOfDay = 'afternoon';
    else timeOfDay = 'evening';

    return {
      timeOfDay,
      dayOfWeek: dayNames[now.getDay()]
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private createFallbackContext(): UserContext {
    return {
      userId: this.userId,
      sessionId: this.generateSessionId(),
      userProfile: {},
      preferences: [],
      currentPage: this.getCurrentPage(),
      currentActivity: 'unknown',
      recentMemories: [],
      relevantMemories: [],
      timestamp: new Date(),
      timeOfDay: this.getTimeContext().timeOfDay,
      dayOfWeek: this.getTimeContext().dayOfWeek,
      deviceType: this.detectDeviceType(),
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      conversationHistory: [],
      contextVersion: '2.0-fallback'
    };
  }

  private async refreshContextForActivity(activity: UserContext['currentActivity']): Promise<void> {
    switch (activity) {
      case 'trip_planning':
        this.currentContext!.activeTrip = await this.loadActiveTrip();
        break;
      case 'expense_tracking':
        this.currentContext!.budgetStatus = await this.loadBudgetStatus();
        this.currentContext!.recentExpenses = await this.loadRecentExpenses();
        break;
    }
  }

  private scheduleContextRefresh(): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    const refreshInterval = (this.options.refreshThreshold || 15) * 60 * 1000;
    this.refreshTimeout = setTimeout(() => {
      this.refreshContext();
      this.scheduleContextRefresh(); // Reschedule
    }, refreshInterval);
  }

  // =====================================================
  // PUBLIC API METHODS
  // =====================================================

  /**
   * Get current context (for debugging/monitoring)
   */
  getCurrentContext(): UserContext | null {
    return this.currentContext;
  }

  /**
   * Check if context is initialized
   */
  isInitialized(): boolean {
    return this.currentContext !== null;
  }

  /**
   * Get context statistics
   */
  getContextStats(): {
    memoryCount: number;
    preferenceCount: number;
    loadTime?: number;
    lastRefresh?: Date;
  } {
    if (!this.currentContext) {
      return { memoryCount: 0, preferenceCount: 0 };
    }

    return {
      memoryCount: this.currentContext.recentMemories.length + this.currentContext.relevantMemories.length,
      preferenceCount: this.currentContext.preferences.length,
      loadTime: this.currentContext.loadTime,
      lastRefresh: this.currentContext.timestamp
    };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
    this.contextCache.clear();
    this.currentContext = null;
  }

  /**
   * Get authentication token for backend requests
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }
}

export default PAMContextManager;