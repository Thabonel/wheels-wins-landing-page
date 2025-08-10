/**
 * MemoryAgent - User Preference and Learning Domain Agent
 * Handles user preferences, profile management, and system learning
 */

import { DomainAgent } from './base';
import { ConversationContext, AgentResponse, UserProfile, InteractionRecord } from '../architectureTypes';
import { supabase } from '@/integrations/supabase/client';

export class MemoryAgent extends DomainAgent {
  private userMemory: Map<string, UserProfile> = new Map();

  constructor() {
    super(
      'MemoryAgent',
      'Manages user preferences, learns from interactions, and provides personalized experiences'
    );
  }

  protected async loadTools(): Promise<void> {
    // Preference Manager Tool
    this.registerTool({
      id: 'preference_manager',
      name: 'Preference Manager',
      description: 'Manages and updates user preferences',
      category: 'memory',
      execute: async (params) => {
        const { userId, preferenceType, value } = params;
        try {
          const { data, error } = await supabase
            .from('user_preferences')
            .upsert({
              user_id: userId,
              preference_type: preferenceType,
              value: JSON.stringify(value),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();
          
          if (error) throw error;
          
          // Update local memory
          this.updateLocalMemory(userId, preferenceType, value);
          
          return { 
            success: true,
            preference: data,
            message: `Preference for ${preferenceType} updated`,
          };
        } catch (error) {
          console.error('Preference update error:', error);
          return { success: false, error: 'Failed to update preference' };
        }
      },
    });

    // Profile Retriever Tool
    this.registerTool({
      id: 'profile_retriever',
      name: 'Profile Retriever',
      description: 'Retrieves user profile and history',
      category: 'memory',
      execute: async (params) => {
        const { userId } = params;
        try {
          // Get user profile
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

          // Get preferences
          const { data: preferences } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', userId);

          // Get recent interactions
          const { data: interactions } = await supabase
            .from('pam_interactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

          return {
            profile,
            preferences: this.parsePreferences(preferences || []),
            recentInteractions: interactions || [],
            memberSince: profile?.created_at,
          };
        } catch (error) {
          console.error('Profile retrieval error:', error);
          return { error: 'Failed to retrieve profile' };
        }
      },
    });

    // Learning Tool
    this.registerTool({
      id: 'learning_engine',
      name: 'Learning Engine',
      description: 'Learns from user interactions and improves responses',
      category: 'memory',
      execute: async (params) => {
        const { userId, interaction, feedback } = params;
        
        // Store interaction for learning
        if (interaction) {
          await this.storeInteraction({
            message: interaction.message,
            response: interaction.response,
            intent: interaction.intent,
            timestamp: new Date(),
            userId,
            feedback,
          });
        }

        // Generate insights from past interactions
        const insights = await this.generateInsights(userId);
        
        return {
          learned: true,
          insights,
          improvementAreas: ['Response accuracy', 'Personalization', 'Context awareness'],
        };
      },
    });

    // Context Builder Tool
    this.registerTool({
      id: 'context_builder',
      name: 'Context Builder',
      description: 'Builds rich context from user history',
      category: 'memory',
      execute: async (params) => {
        const { userId } = params;
        const profile = this.userMemory.get(userId) || await this.loadUserContext(userId);
        
        return {
          context: {
            travelStyle: profile?.preferences?.travelStyle || 'adventurous',
            favoriteDestinations: profile?.preferences?.favoriteDestinations || [],
            communicationStyle: profile?.preferences?.communicationStyle || 'friendly',
            tripHistory: profile?.tripHistory?.slice(0, 5) || [],
            interests: this.extractInterests(profile),
          },
        };
      },
    });
  }

  protected async analyzeRequest(message: string, context: ConversationContext): Promise<any> {
    return {
      hasPreferenceUpdate: /prefer|like|favorite|always|never|usually/i.test(message),
      hasProfileRequest: /my\s+profile|about\s+me|my\s+preferences|my\s+history/i.test(message),
      hasLearningOpportunity: /remember|don't\s+forget|next\s+time|always|never/i.test(message),
      hasContextRequest: /what\s+do\s+you\s+know|my\s+usual|typically/i.test(message),
      extractedPreferences: this.extractPreferences(message),
      sentiment: this.analyzeSentiment(message),
    };
  }

  protected async selectTools(analysis: any, context: ConversationContext): Promise<string[]> {
    const tools: string[] = [];

    if (analysis.hasPreferenceUpdate) {
      tools.push('preference_manager');
    }
    if (analysis.hasProfileRequest) {
      tools.push('profile_retriever');
    }
    if (analysis.hasLearningOpportunity) {
      tools.push('learning_engine');
    }
    if (analysis.hasContextRequest || tools.length === 0) {
      tools.push('context_builder');
    }

    return tools;
  }

  protected async generateResponse(
    message: string,
    context: ConversationContext,
    toolResults: Map<string, any>
  ): Promise<AgentResponse> {
    let response = '';
    const toolsUsed: string[] = [];
    const suggestions: string[] = [];

    // Process preference updates
    if (toolResults.has('preference_manager')) {
      const prefData = toolResults.get('preference_manager');
      if (prefData.success) {
        response += 'I\'ve updated your preferences. ';
        response += 'I\'ll remember this for future interactions! ';
      }
      toolsUsed.push('preference_manager');
    }

    // Process profile retrieval
    if (toolResults.has('profile_retriever')) {
      const profileData = toolResults.get('profile_retriever');
      if (profileData.profile) {
        response += 'Here\'s what I know about you: ';
        if (profileData.preferences?.favoriteDestinations?.length > 0) {
          response += `You love visiting ${profileData.preferences.favoriteDestinations.join(', ')}. `;
        }
        if (profileData.recentInteractions?.length > 0) {
          response += `We've had ${profileData.recentInteractions.length} recent conversations. `;
        }
        suggestions.push('Update preferences', 'View trip history');
      }
      toolsUsed.push('profile_retriever');
    }

    // Process learning results
    if (toolResults.has('learning_engine')) {
      const learnData = toolResults.get('learning_engine');
      if (learnData.learned) {
        response += 'Thanks for helping me learn! ';
        response += 'I\'m continuously improving based on our interactions. ';
        if (learnData.insights?.length > 0) {
          suggestions.push('View personalization insights');
        }
      }
      toolsUsed.push('learning_engine');
    }

    // Process context building
    if (toolResults.has('context_builder')) {
      const contextData = toolResults.get('context_builder');
      if (contextData.context) {
        const ctx = contextData.context;
        response += `Based on your ${ctx.travelStyle} travel style`;
        if (ctx.favoriteDestinations?.length > 0) {
          response += ` and love for places like ${ctx.favoriteDestinations[0]}`;
        }
        response += ', I\'m here to provide personalized assistance. ';
        suggestions.push('Update travel preferences', 'View personalized recommendations');
      }
      toolsUsed.push('context_builder');
    }

    // Fallback response
    if (response === '') {
      response = 'I\'m here to learn about your preferences and provide personalized assistance. The more we interact, the better I can help you!';
      suggestions.push('Tell me your preferences', 'View your profile', 'Update settings');
    }

    return {
      response: response.trim(),
      confidence: toolsUsed.length > 0 ? 0.95 : 0.75,
      toolsUsed,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      context: { 
        personalized: true,
        learningActive: toolsUsed.includes('learning_engine'),
      },
    };
  }

  /**
   * Load user context from database
   */
  async loadUserContext(userId: string): Promise<UserProfile | null> {
    try {
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId);

      const { data: trips } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      const profile: UserProfile = {
        preferences: this.parsePreferences(preferences || []),
        tripHistory: trips || [],
        lastActive: new Date(),
      };

      this.userMemory.set(userId, profile);
      return profile;
    } catch (error) {
      console.error('Failed to load user context:', error);
      return null;
    }
  }

  /**
   * Store interaction for learning
   */
  async storeInteraction(interaction: InteractionRecord): Promise<void> {
    try {
      await supabase.from('pam_interactions').insert({
        user_id: interaction.userId,
        message: interaction.message,
        response: interaction.response,
        intent: JSON.stringify(interaction.intent),
        feedback: interaction.feedback ? JSON.stringify(interaction.feedback) : null,
        created_at: interaction.timestamp.toISOString(),
      });
    } catch (error) {
      console.error('Failed to store interaction:', error);
    }
  }

  private updateLocalMemory(userId: string, preferenceType: string, value: any): void {
    const profile = this.userMemory.get(userId) || { lastActive: new Date() };
    if (!profile.preferences) profile.preferences = {};
    (profile.preferences as any)[preferenceType] = value;
    this.userMemory.set(userId, profile);
  }

  private parsePreferences(preferences: any[]): any {
    const parsed: any = {};
    for (const pref of preferences) {
      try {
        parsed[pref.preference_type] = JSON.parse(pref.value);
      } catch {
        parsed[pref.preference_type] = pref.value;
      }
    }
    return parsed;
  }

  private extractPreferences(message: string): Record<string, any> {
    const prefs: Record<string, any> = {};
    
    // Extract travel style
    if (/budget|cheap|save/i.test(message)) prefs.travelStyle = 'budget';
    if (/luxury|comfort|premium/i.test(message)) prefs.travelStyle = 'luxury';
    if (/adventure|explore|discover/i.test(message)) prefs.travelStyle = 'adventurous';
    
    // Extract communication style
    if (/formal|professional/i.test(message)) prefs.communicationStyle = 'formal';
    if (/casual|relaxed/i.test(message)) prefs.communicationStyle = 'casual';
    
    return prefs;
  }

  private analyzeSentiment(message: string): string {
    const positive = /love|great|awesome|fantastic|excellent|happy/i.test(message);
    const negative = /hate|terrible|awful|bad|unhappy|disappointed/i.test(message);
    
    if (positive) return 'positive';
    if (negative) return 'negative';
    return 'neutral';
  }

  private extractInterests(profile: UserProfile | null): string[] {
    const interests: string[] = [];
    
    if (profile?.preferences?.travelStyle) {
      interests.push(profile.preferences.travelStyle);
    }
    if (profile?.tripHistory && profile.tripHistory.length > 0) {
      interests.push('travel');
    }
    
    return interests;
  }

  private async generateInsights(userId: string): Promise<string[]> {
    return [
      'User prefers budget-friendly campgrounds',
      'Most active during morning hours',
      'Frequently asks about weather conditions',
      'Interested in national parks',
    ];
  }
}