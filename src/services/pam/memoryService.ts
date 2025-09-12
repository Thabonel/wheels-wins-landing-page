/**
 * PAM Memory Service - Intelligent Memory Management
 * 
 * Features:
 * - Vector embeddings with OpenAI text-embedding-3-small
 * - Semantic search using cosine similarity
 * - Three memory types: working (24hr), episodic (30 days), semantic (permanent)
 * - GDPR-compliant data retention and deletion
 * - Caching for frequently accessed memories
 * - Preference learning from user interactions
 * - Maximal Marginal Relevance (MMR) for diverse results
 */

import { supabase } from '@/integrations/supabase/client';
import { getValidAccessToken } from '@/utils/websocketAuth';

// Types and Interfaces
export interface Memory {
  id: string;
  user_id: string;
  memory_type: 'working' | 'episodic' | 'semantic';
  content: any;
  content_text: string;
  embedding?: number[];
  importance_score: number;
  access_count: number;
  last_accessed: string;
  context: any;
  related_conversation_id?: string;
  expires_at?: string;
  is_active: boolean;
  source: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface UserPreference {
  id: string;
  user_id: string;
  category: string;
  preference_key: string;
  preference_value: any;
  confidence: number;
  evidence_count: number;
  source: 'explicit' | 'inferred' | 'default';
  active: boolean;
  last_confirmed: string;
  context: any;
  created_at: string;
  updated_at: string;
}

export interface IntentPattern {
  id: string;
  user_id: string;
  pattern_type: string;
  pattern_signature: string;
  pattern_data: any;
  trigger_conditions: any;
  frequency: number;
  last_occurrence: string;
  typical_time_of_day?: number;
  typical_day_of_week?: number;
  context: any;
  created_at: string;
  updated_at: string;
}

export interface SearchOptions {
  memoryTypes?: ('working' | 'episodic' | 'semantic')[];
  maxResults?: number;
  similarityThreshold?: number;
  timeWindow?: Date;
  includeContext?: boolean;
  diversityFactor?: number; // For MMR algorithm
}

export interface ScoredMemory extends Memory {
  similarity_score: number;
  relevance_score: number;
  recency_score: number;
}

export interface EmbeddingCache {
  [key: string]: {
    embedding: number[];
    timestamp: number;
  };
}

export class PAMMemoryService {
  private cache: Map<string, Memory[]> = new Map();
  private embeddingCache: Map<string, number[]> = new Map();
  private readonly CACHE_TTL = 300000; // 5 minutes
  private readonly EMBEDDING_CACHE_TTL = 600000; // 10 minutes
  private readonly OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

  constructor(private userId: string) {}

  // =====================================================
  // CORE MEMORY OPERATIONS
  // =====================================================

  /**
   * Store a new memory with automatic embedding generation
   */
  async storeMemory(
    content: any,
    memoryType: 'working' | 'episodic' | 'semantic',
    options: {
      importance?: number;
      context?: any;
      conversationId?: string;
      tags?: string[];
      source?: string;
    } = {}
  ): Promise<Memory> {
    const {
      importance = 0.5,
      context = {},
      conversationId,
      tags = [],
      source = 'user_interaction'
    } = options;

    // Extract text content for embedding
    const contentText = this.extractTextContent(content);
    
    // Generate embedding
    const embedding = await this.generateEmbedding(contentText);

    // Prepare memory data
    const memoryData = {
      user_id: this.userId,
      memory_type: memoryType,
      content,
      content_text: contentText,
      embedding,
      importance_score: importance,
      context,
      related_conversation_id: conversationId,
      tags,
      source,
      is_active: true
    };

    // Store in database
    const { data, error } = await supabase
      .from('pam_memories')
      .insert(memoryData)
      .select()
      .single();

    if (error) {
      console.error('Error storing memory:', error);
      throw new Error(`Failed to store memory: ${error.message}`);
    }

    // Clear cache
    this.clearUserCache();

    console.log(`✅ Stored ${memoryType} memory:`, data.id);
    return data;
  }

  /**
   * Search memories using semantic similarity
   */
  async searchMemories(
    query: string,
    options: SearchOptions = {}
  ): Promise<ScoredMemory[]> {
    const {
      memoryTypes = ['working', 'episodic', 'semantic'],
      maxResults = 10,
      similarityThreshold = 0.75,
      timeWindow,
      includeContext = true,
      diversityFactor = 0.3
    } = options;

    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);

      // Get similar memories from database
      const { data, error } = await supabase
        .rpc('find_similar_memories', {
          target_user_id: this.userId,
          query_embedding: queryEmbedding,
          similarity_threshold: similarityThreshold,
          max_results: maxResults * 2, // Get more candidates for MMR
          memory_types: memoryTypes
        });

      if (error) {
        console.error('Error searching memories:', error);
        throw new Error(`Memory search failed: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Score and enhance memories
      const scoredMemories = data.map((memory: any) => ({
        ...memory,
        similarity_score: memory.similarity_score,
        relevance_score: memory.similarity_score,
        recency_score: this.calculateRecencyScore(new Date(memory.created_at))
      }));

      // Apply time window filter if specified
      let filteredMemories = scoredMemories;
      if (timeWindow) {
        filteredMemories = scoredMemories.filter(
          m => new Date(m.created_at) >= timeWindow
        );
      }

      // Apply MMR for diversity
      const diverseMemories = this.applyMaximalMarginalRelevance(
        filteredMemories,
        queryEmbedding,
        maxResults,
        diversityFactor
      );

      // Update access patterns
      await this.updateAccessPatterns(diverseMemories.map(m => m.id));

      console.log(`🔍 Found ${diverseMemories.length} relevant memories for: "${query}"`);
      return diverseMemories;
    } catch (error) {
      console.error('Memory search error:', error);
      return [];
    }
  }

  /**
   * Get memories by type with caching
   */
  async getMemoriesByType(
    memoryType: 'working' | 'episodic' | 'semantic',
    limit: number = 50
  ): Promise<Memory[]> {
    const cacheKey = `${this.userId}-${memoryType}-${limit}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      console.log(`💾 Cache hit for ${memoryType} memories`);
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('pam_memories')
        .select('*')
        .eq('user_id', this.userId)
        .eq('memory_type', memoryType)
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${  new Date().toISOString()}`)
        .order('importance_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to get ${memoryType} memories: ${error.message}`);
      }

      const memories = data || [];
      
      // Cache the results
      this.cache.set(cacheKey, memories);
      setTimeout(() => this.cache.delete(cacheKey), this.CACHE_TTL);

      return memories;
    } catch (error) {
      console.error(`Error getting ${memoryType} memories:`, error);
      return [];
    }
  }

  // =====================================================
  // PREFERENCE MANAGEMENT
  // =====================================================

  /**
   * Learn a user preference from interaction
   */
  async learnPreference(
    category: string,
    preferenceKey: string,
    preferenceValue: any,
    options: {
      confidence?: number;
      source?: 'explicit' | 'inferred' | 'default';
      context?: any;
    } = {}
  ): Promise<UserPreference> {
    const {
      confidence = 0.8,
      source = 'inferred',
      context = {}
    } = options;

    try {
      // Check if preference already exists
      const { data: existing } = await supabase
        .from('pam_user_preferences')
        .select('*')
        .eq('user_id', this.userId)
        .eq('category', category)
        .eq('preference_key', preferenceKey)
        .single();

      if (existing) {
        // Update existing preference with new evidence
        const newConfidence = Math.min(1.0, existing.confidence + (confidence * 0.1));
        const newEvidenceCount = existing.evidence_count + 1;

        const { data, error } = await supabase
          .from('pam_user_preferences')
          .update({
            preference_value: preferenceValue,
            confidence: newConfidence,
            evidence_count: newEvidenceCount,
            last_confirmed: new Date().toISOString(),
            context: { ...existing.context, ...context }
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        console.log(`📈 Updated preference: ${category}.${preferenceKey}`);
        return data;
      } else {
        // Create new preference
        const { data, error } = await supabase
          .from('pam_user_preferences')
          .insert({
            user_id: this.userId,
            category,
            preference_key: preferenceKey,
            preference_value: preferenceValue,
            confidence,
            evidence_count: 1,
            source,
            context
          })
          .select()
          .single();

        if (error) throw error;
        console.log(`✨ Learned new preference: ${category}.${preferenceKey}`);
        return data;
      }
    } catch (error) {
      console.error('Error learning preference:', error);
      throw new Error(`Failed to learn preference: ${error}`);
    }
  }

  /**
   * Get user preferences by category
   */
  async getUserPreferences(
    category?: string,
    activeOnly: boolean = true
  ): Promise<UserPreference[]> {
    try {
      let query = supabase
        .from('pam_user_preferences')
        .select('*')
        .eq('user_id', this.userId);

      if (category) {
        query = query.eq('category', category);
      }

      if (activeOnly) {
        query = query.eq('active', true);
      }

      query = query.order('confidence', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to get preferences: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting preferences:', error);
      return [];
    }
  }

  // =====================================================
  // INTENT PATTERN TRACKING
  // =====================================================

  /**
   * Record user intent pattern
   */
  async recordIntentPattern(
    patternType: string,
    patternData: any,
    context: any = {}
  ): Promise<void> {
    try {
      // Create pattern signature for deduplication
      const patternSignature = this.createPatternSignature(patternType, patternData);

      // Check if pattern exists
      const { data: existing } = await supabase
        .from('pam_intent_patterns')
        .select('*')
        .eq('user_id', this.userId)
        .eq('pattern_type', patternType)
        .eq('pattern_signature', patternSignature)
        .single();

      const now = new Date();
      const timeOfDay = now.getHours();
      const dayOfWeek = now.getDay();

      if (existing) {
        // Update existing pattern
        await supabase
          .from('pam_intent_patterns')
          .update({
            frequency: existing.frequency + 1,
            last_occurrence: now.toISOString(),
            typical_time_of_day: this.updateTypicalTime(existing.typical_time_of_day, timeOfDay, existing.frequency),
            typical_day_of_week: this.updateTypicalDay(existing.typical_day_of_week, dayOfWeek, existing.frequency),
            pattern_data: { ...existing.pattern_data, ...patternData },
            context: { ...existing.context, ...context }
          })
          .eq('id', existing.id);
      } else {
        // Create new pattern
        await supabase
          .from('pam_intent_patterns')
          .insert({
            user_id: this.userId,
            pattern_type: patternType,
            pattern_signature: patternSignature,
            pattern_data: patternData,
            frequency: 1,
            last_occurrence: now.toISOString(),
            typical_time_of_day: timeOfDay,
            typical_day_of_week: dayOfWeek,
            context
          });
      }

      console.log(`📊 Recorded intent pattern: ${patternType}`);
    } catch (error) {
      console.error('Error recording intent pattern:', error);
    }
  }

  // =====================================================
  // GDPR COMPLIANCE & CLEANUP
  // =====================================================

  /**
   * Delete all user memories (GDPR compliance)
   */
  async deleteAllUserMemories(): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('delete_user_pam_memories', { target_user_id: this.userId });

      if (error) {
        throw new Error(`Failed to delete user memories: ${error.message}`);
      }

      // Clear cache
      this.clearUserCache();

      console.log(`🗑️ Deleted ${data} memories for user ${this.userId}`);
      return data;
    } catch (error) {
      console.error('Error deleting user memories:', error);
      throw error;
    }
  }

  /**
   * Clean up expired memories
   */
  async cleanupExpiredMemories(): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('cleanup_expired_pam_memories');

      if (error) {
        throw new Error(`Failed to cleanup expired memories: ${error.message}`);
      }

      // Clear cache
      this.clearUserCache();

      console.log(`🧹 Cleaned up ${data} expired memories`);
      return data;
    } catch (error) {
      console.error('Error cleaning up memories:', error);
      return 0;
    }
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  private async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cacheKey = this.hashText(text);
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
          encoding_format: 'float'
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const embedding = data.data[0].embedding;

      // Cache the embedding
      this.embeddingCache.set(cacheKey, embedding);
      setTimeout(() => this.embeddingCache.delete(cacheKey), this.EMBEDDING_CACHE_TTL);

      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Return zero vector as fallback
      return new Array(1536).fill(0);
    }
  }

  private extractTextContent(content: any): string {
    if (typeof content === 'string') {
      return content;
    }

    if (typeof content === 'object' && content !== null) {
      // Extract text from various content structures
      if (content.text) return content.text;
      if (content.message) return content.message;
      if (content.content) return content.content;
      if (content.description) return content.description;
      
      // Fallback: stringify and extract meaningful text
      return JSON.stringify(content)
        .replace(/[{},"]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return String(content);
  }

  private calculateRecencyScore(createdAt: Date): number {
    const hoursSince = (Date.now() - createdAt.getTime()) / 3600000;
    return Math.exp(-hoursSince / 168); // Decay over a week
  }

  private applyMaximalMarginalRelevance(
    memories: ScoredMemory[],
    queryEmbedding: number[],
    k: number,
    lambda: number
  ): ScoredMemory[] {
    if (memories.length <= k) return memories;

    const selected: ScoredMemory[] = [];
    const candidates = [...memories];

    while (selected.length < k && candidates.length > 0) {
      let bestScore = -Infinity;
      let bestIndex = -1;

      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        
        // Relevance to query
        const relevance = candidate.similarity_score;
        
        // Maximum similarity to already selected
        let maxSim = 0;
        for (const sel of selected) {
          const sim = this.cosineSimilarity(
            candidate.embedding || [],
            sel.embedding || []
          );
          maxSim = Math.max(maxSim, sim);
        }
        
        // MMR score balances relevance and diversity
        const mmrScore = lambda * relevance - (1 - lambda) * maxSim;
        
        // Boost based on importance and recency
        const finalScore = mmrScore * 
          (1 + 0.2 * candidate.importance_score) * 
          (1 + 0.1 * candidate.recency_score);
        
        if (finalScore > bestScore) {
          bestScore = finalScore;
          bestIndex = i;
        }
      }
      
      if (bestIndex >= 0) {
        selected.push(candidates[bestIndex]);
        candidates.splice(bestIndex, 1);
      }
    }

    return selected;
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async updateAccessPatterns(memoryIds: string[]): Promise<void> {
    if (memoryIds.length === 0) return;

    try {
      // Update access counts and timestamps for retrieved memories
      const updates = memoryIds.map(id => 
        supabase.rpc('update_memory_importance', {
          memory_id: id,
          access_boost: 0.05 // Small boost for being accessed
        })
      );

      await Promise.all(updates);
    } catch (error) {
      console.error('Error updating access patterns:', error);
    }
  }

  private createPatternSignature(patternType: string, patternData: any): string {
    // Create a normalized signature for pattern deduplication
    const key = JSON.stringify({
      type: patternType,
      data: this.normalizePatternData(patternData)
    });
    return this.hashText(key);
  }

  private normalizePatternData(data: any): any {
    // Normalize pattern data for consistent signatures
    if (typeof data !== 'object' || data === null) return data;

    const normalized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === 'timestamp' || key.includes('_at')) continue; // Skip timestamps
      normalized[key] = value;
    }
    return normalized;
  }

  private updateTypicalTime(existing: number | null, newTime: number, frequency: number): number {
    if (existing === null) return newTime;
    // Weighted average favoring more recent observations
    return Math.round((existing * frequency + newTime) / (frequency + 1));
  }

  private updateTypicalDay(existing: number | null, newDay: number, frequency: number): number {
    if (existing === null) return newDay;
    // Weighted average for day of week
    return Math.round((existing * frequency + newDay) / (frequency + 1));
  }

  private hashText(text: string): string {
    // Simple hash function for caching keys
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private clearUserCache(): void {
    // Clear all cache entries for this user
    for (const [key] of this.cache.entries()) {
      if (key.startsWith(this.userId)) {
        this.cache.delete(key);
      }
    }
  }

  // =====================================================
  // PUBLIC UTILITY METHODS
  // =====================================================

  /**
   * Get memory statistics for monitoring
   */
  async getMemoryStats(): Promise<{
    totalMemories: number;
    workingMemories: number;
    episodicMemories: number;
    semanticMemories: number;
    averageImportance: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('pam_memory_stats')
        .select('*')
        .single();

      if (error) throw error;

      return {
        totalMemories: data.total_memories || 0,
        workingMemories: data.working_memories || 0,
        episodicMemories: data.episodic_memories || 0,
        semanticMemories: data.semantic_memories || 0,
        averageImportance: data.avg_importance || 0
      };
    } catch (error) {
      console.error('Error getting memory stats:', error);
      return {
        totalMemories: 0,
        workingMemories: 0,
        episodicMemories: 0,
        semanticMemories: 0,
        averageImportance: 0
      };
    }
  }

  /**
   * Test embedding generation (for debugging)
   */
  async testEmbedding(text: string): Promise<{ success: boolean; dimension: number; preview: number[] }> {
    try {
      const embedding = await this.generateEmbedding(text);
      return {
        success: true,
        dimension: embedding.length,
        preview: embedding.slice(0, 5)
      };
    } catch (error) {
      return {
        success: false,
        dimension: 0,
        preview: []
      };
    }
  }
}

export default PAMMemoryService;