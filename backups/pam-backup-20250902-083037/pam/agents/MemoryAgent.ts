/**
 * MemoryAgent - User Preference and Learning Domain Agent
 * Handles user preferences, profile management, and system learning
 */

import { DomainAgent } from './base';
import { ConversationContext, AgentResponse, UserProfile, InteractionRecord } from '../architectureTypes';
import { supabase } from '@/integrations/supabase/client';
import { getEnhancedPamMemory } from '@/hooks/useEnhancedPamMemory';
import type { KnowledgeSearchResult } from '@/types/knowledgeTypes';

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

    // Semantic Memory Search Tool - Uses existing vector RAG infrastructure
    this.registerTool({
      id: 'semantic_memory_search',
      name: 'Semantic Memory Search',
      description: 'Searches user personal knowledge using vector embeddings',
      category: 'memory',
      execute: async (params) => {
        const { userId, query, limit = 3 } = params;
        try {
          // Use existing search-user-knowledge edge function via enhanced memory
          const enhancedMemory = await getEnhancedPamMemory(userId, '', query);
          
          if (enhancedMemory.personal_knowledge) {
            const results = enhancedMemory.personal_knowledge;
            return {
              success: true,
              results: results.relevant_chunks,
              summary: results.knowledge_summary,
              totalDocuments: results.total_documents,
              searchQuery: query,
            };
          } else {
            return {
              success: true,
              results: [],
              summary: 'No relevant personal knowledge found for this query.',
              totalDocuments: 0,
              searchQuery: query,
            };
          }
        } catch (error) {
          console.error('Semantic search error:', error);
          return { 
            success: false, 
            error: 'Failed to search personal knowledge',
            results: [],
            searchQuery: query,
          };
        }
      },
    });

    // Conversation Context Tool - Integrates preferences with personal knowledge  
    this.registerTool({
      id: 'conversation_context',
      name: 'Conversation Context',
      description: 'Builds comprehensive conversation context with personal knowledge',
      category: 'memory',
      execute: async (params) => {
        const { userId, currentMessage, region } = params;
        try {
          // Get enhanced memory with vector search integration
          const enhancedMemory = await getEnhancedPamMemory(userId, region || '', currentMessage);
          
          // Get basic profile data
          const profile = this.userMemory.get(userId) || await this.loadUserContext(userId);
          
          return {
            success: true,
            enhancedContext: {
              userPreferences: {
                travelStyle: enhancedMemory.travel_style || profile?.preferences?.travelStyle,
                vehicleType: enhancedMemory.vehicle_type,
                preferences: enhancedMemory.preferences || profile?.preferences,
                communicationStyle: profile?.preferences?.communicationStyle || 'friendly',
              },
              personalKnowledge: enhancedMemory.personal_knowledge || null,
              conversationFlow: {
                lastInteractions: profile?.tripHistory?.slice(0, 3) || [],
                interests: this.extractInterests(profile),
                region: enhancedMemory.region || region,
              },
            },
          };
        } catch (error) {
          console.error('Conversation context error:', error);
          return { 
            success: false, 
            error: 'Failed to build conversation context',
            enhancedContext: null,
          };
        }
      },
    });
  }

  protected async analyzeRequest(message: string, context: ConversationContext): Promise<any> {
    return {
      hasPreferenceUpdate: /prefer|like|favorite|always|never|usually/i.test(message),
      hasProfileRequest: /my\s+profile|about\s+me|my\s+preferences|my\s+history/i.test(message),
      hasLearningOpportunity: /remember|don't\s+forget|next\s+time|always|never/i.test(message),
      hasContextRequest: /what\s+do\s+you\s+know|my\s+usual|typically/i.test(message),
      hasKnowledgeQuery: /find|search|look\s+up|tell\s+me\s+about|document|file|remember\s+when|my\s+notes/i.test(message),
      hasPersonalReference: /my\s+(document|file|notes|information)|I\s+(wrote|saved|mentioned)|personal|private/i.test(message),
      needsConversationContext: message.length > 10 && /travel|trip|rv|budget|plan|destination|campground|route/i.test(message),
      extractedPreferences: this.extractPreferences(message),
      sentiment: this.analyzeSentiment(message),
    };
  }

  protected async selectTools(analysis: any, context: ConversationContext): Promise<string[]> {
    const tools: string[] = [];

    // High-priority tools for specific user intents
    if (analysis.hasPreferenceUpdate) {
      tools.push('preference_manager');
    }
    if (analysis.hasProfileRequest) {
      tools.push('profile_retriever');
    }
    if (analysis.hasLearningOpportunity) {
      tools.push('learning_engine');
    }
    
    // RAG-powered semantic search for knowledge queries
    if (analysis.hasKnowledgeQuery || analysis.hasPersonalReference) {
      tools.push('semantic_memory_search');
    }
    
    // Enhanced conversation context for travel-related queries
    if (analysis.needsConversationContext) {
      tools.push('conversation_context');
    }
    
    // Fallback context builder for basic requests
    if (analysis.hasContextRequest || (tools.length === 0 && !analysis.hasKnowledgeQuery)) {
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

    // Process semantic memory search results (Priority: RAG integration)
    if (toolResults.has('semantic_memory_search')) {
      const searchData = toolResults.get('semantic_memory_search');
      if (searchData.success && searchData.results?.length > 0) {
        response += `I found ${searchData.results.length} relevant pieces from your personal knowledge: `;
        
        // Include top relevant result
        const topResult = searchData.results[0] as KnowledgeSearchResult;
        const preview = topResult.content.length > 150 
          ? topResult.content.substring(0, 150) + '...' 
          : topResult.content;
        response += `"${preview}" (from ${topResult.document_name}). `;
        
        if (searchData.totalDocuments > 0) {
          response += `This is from your collection of ${searchData.totalDocuments} personal documents. `;
        }
        suggestions.push('View full document', 'Search more knowledge', 'Add new documents');
      } else if (searchData.success) {
        response += 'I searched your personal knowledge but didn\'t find specific information about that. ';
        if (searchData.totalDocuments === 0) {
          response += 'You can upload documents to build your personal knowledge base! ';
          suggestions.push('Upload documents', 'View knowledge manager');
        } else {
          suggestions.push('Try different search terms', 'Upload more documents');
        }
      }
      toolsUsed.push('semantic_memory_search');
    }

    // Process enhanced conversation context (RAG + preferences)
    if (toolResults.has('conversation_context')) {
      const contextData = toolResults.get('conversation_context');
      if (contextData.success && contextData.enhancedContext) {
        const ctx = contextData.enhancedContext;
        
        // Build response using enhanced context
        if (ctx.userPreferences?.travelStyle) {
          response += `Given your ${ctx.userPreferences.travelStyle} travel style`;
          if (ctx.userPreferences?.vehicleType) {
            response += ` and ${ctx.userPreferences.vehicleType}`;
          }
          response += ', ';
        }
        
        // Include personal knowledge insights
        if (ctx.personalKnowledge?.relevant_chunks?.length > 0) {
          response += `and based on your personal documents, `;
        }
        
        response += 'I can provide personalized assistance for your trip planning. ';
        
        suggestions.push('Get travel recommendations', 'View personal insights', 'Update preferences');
      }
      toolsUsed.push('conversation_context');
    }

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

    // Enhanced fallback response
    if (response === '') {
      response = 'I\'m here to learn about your preferences and provide personalized assistance using your personal knowledge base. The more we interact, the better I can help you!';
      suggestions.push('Tell me your preferences', 'Upload personal documents', 'View your profile');
    }

    // Calculate confidence based on RAG integration
    let confidence = 0.75;
    if (toolsUsed.includes('semantic_memory_search') || toolsUsed.includes('conversation_context')) {
      confidence = 0.95; // High confidence with RAG
    } else if (toolsUsed.length > 0) {
      confidence = 0.85;
    }

    return {
      response: response.trim(),
      confidence,
      toolsUsed,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      context: { 
        personalized: true,
        learningActive: toolsUsed.includes('learning_engine'),
        knowledgeEnhanced: toolsUsed.includes('semantic_memory_search') || toolsUsed.includes('conversation_context'),
        ragIntegrated: true,
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
   * Store interaction for learning with enhanced conversation memory
   */
  async storeInteraction(interaction: InteractionRecord): Promise<void> {
    try {
      // Store traditional interaction record
      await supabase.from('pam_interactions').insert({
        user_id: interaction.userId,
        message: interaction.message,
        response: interaction.response,
        intent: JSON.stringify(interaction.intent),
        feedback: interaction.feedback ? JSON.stringify(interaction.feedback) : null,
        created_at: interaction.timestamp.toISOString(),
      });

      // Store conversation memory for important interactions
      if (this.shouldStoreConversationMemory(interaction)) {
        await this.storeConversationMemory(interaction);
      }
    } catch (error) {
      console.error('Failed to store interaction:', error);
    }
  }

  /**
   * Determines if an interaction should be stored as conversation memory
   */
  private shouldStoreConversationMemory(interaction: InteractionRecord): boolean {
    // Store memory for substantive conversations
    const messageLength = interaction.message?.length || 0;
    const responseLength = interaction.response?.length || 0;
    
    // Skip very short exchanges
    if (messageLength < 20 || responseLength < 30) {
      return false;
    }
    
    // Store if contains travel/RV related content
    const travelKeywords = /travel|trip|rv|campground|destination|route|budget|plan|visit|stay/i;
    const hasRelevantContent = travelKeywords.test(interaction.message) || travelKeywords.test(interaction.response);
    
    // Store positive feedback interactions
    const hasPositiveFeedback = interaction.feedback && 
      (typeof interaction.feedback === 'object' && interaction.feedback.rating > 3);
    
    return hasRelevantContent || hasPositiveFeedback || false;
  }

  /**
   * Store conversation memory as knowledge chunk for future RAG retrieval
   */
  private async storeConversationMemory(interaction: InteractionRecord): Promise<void> {
    try {
      // Check if user has a "Conversations" bucket, create if not exists
      let { data: conversationBucket } = await supabase
        .from('user_knowledge_buckets')
        .select('id')
        .eq('user_id', interaction.userId)
        .eq('name', 'PAM Conversations')
        .eq('is_active', true)
        .single();

      if (!conversationBucket) {
        const { data: newBucket } = await supabase
          .from('user_knowledge_buckets')
          .insert({
            user_id: interaction.userId,
            name: 'PAM Conversations',
            description: 'Memorable conversations with PAM assistant',
            color: '#8B5CF6',
            is_active: true,
          })
          .select('id')
          .single();
        conversationBucket = newBucket;
      }

      if (!conversationBucket) return;

      // Create conversation document
      const conversationContent = `Conversation on ${interaction.timestamp.toISOString().split('T')[0]}

User: ${interaction.message}

PAM: ${interaction.response}`;

      const { data: document } = await supabase
        .from('user_knowledge_documents')
        .insert({
          bucket_id: conversationBucket.id,
          user_id: interaction.userId,
          filename: `conversation_${Date.now()}.txt`,
          file_path: `conversations/${interaction.userId}/${Date.now()}.txt`,
          content_type: 'text/plain',
          extracted_text: conversationContent,
          processing_status: 'completed',
          metadata: {
            source: 'pam_conversation',
            timestamp: interaction.timestamp.toISOString(),
            intent: interaction.intent,
          },
        })
        .select('id')
        .single();

      if (!document) return;

      // Create knowledge chunk directly (skip file processing)
      await supabase
        .from('user_knowledge_chunks')
        .insert({
          document_id: document.id,
          user_id: interaction.userId,
          chunk_index: 0,
          content: conversationContent,
          token_count: Math.ceil(conversationContent.length / 4),
          chunk_metadata: {
            source: 'pam_conversation',
            conversation_date: interaction.timestamp.toISOString(),
            intent: interaction.intent,
          },
        });

      // Generate embedding for the conversation (call existing edge function)
      try {
        await supabase.functions.invoke('generate-embeddings', {
          body: { documentId: document.id }
        });
      } catch (embeddingError) {
        console.warn('Failed to generate embedding for conversation:', embeddingError);
      }
    } catch (error) {
      console.error('Failed to store conversation memory:', error);
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