
import { supabase } from '@/integrations/supabase/client';
import type { EnhancedPamMemory, KnowledgeSearchResult } from '@/types/knowledgeTypes';
import { apiFetch } from '@/services/api';

// Helper function to get enhanced PAM memory including personal knowledge
export const getEnhancedPamMemory = async (userId: string, region: string, currentContext?: string): Promise<EnhancedPamMemory> => {
  try {
    // Get existing localStorage memory
    const travelPrefs = localStorage.getItem('travel_preferences');
    const vehicleInfo = localStorage.getItem('vehicle_info');
    const budgetPrefs = localStorage.getItem('budget_preferences');
    const userPrefs = localStorage.getItem('user_preferences');
    
    const basicMemory: any = {};
    
    // Add region
    if (region) {
      basicMemory.region = region;
    }
    
    // Parse and include existing preferences
    if (travelPrefs) {
      try {
        const parsed = JSON.parse(travelPrefs);
        if (parsed.travel_style) basicMemory.travel_style = parsed.travel_style;
        if (parsed.preferences) basicMemory.preferences = parsed.preferences;
      } catch (e) {
        console.warn('Failed to parse travel preferences:', e);
      }
    }
    
    if (vehicleInfo) {
      try {
        const parsed = JSON.parse(vehicleInfo);
        if (parsed.vehicle_type) basicMemory.vehicle_type = parsed.vehicle_type;
      } catch (e) {
        console.warn('Failed to parse vehicle info:', e);
      }
    }
    
    if (budgetPrefs) {
      try {
        const parsed = JSON.parse(budgetPrefs);
        if (parsed.budget_focus) basicMemory.budget_focus = parsed.budget_focus;
      } catch (e) {
        console.warn('Failed to parse budget preferences:', e);
      }
    }
    
    if (userPrefs) {
      try {
        const parsed = JSON.parse(userPrefs);
        if (parsed.preferences) {
          basicMemory.preferences = { ...basicMemory.preferences, ...parsed.preferences };
        }
      } catch (e) {
        console.warn('Failed to parse user preferences:', e);
      }
    }

    // Get personal knowledge if context is provided
    let personalKnowledge = undefined;
    
    if (currentContext && currentContext.trim().length > 0) {
      try {
        console.log('🔍 Searching personal knowledge for context:', currentContext);
        
        const response = await apiFetch('/api/v1/knowledge/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, query: currentContext, limit: 3 })
        });
        const searchResults = response.ok ? await response.json() : null;
        const error = response.ok ? null : new Error('Request failed');

        if (error) {
          console.error('❌ Knowledge search error:', error);
        } else if (searchResults?.results && searchResults.results.length > 0) {
          console.log('✅ Found personal knowledge:', searchResults.results.length, 'chunks');
          
          // Get document count for the user
          const { count: docCount } = await supabase
            .from('user_knowledge_documents')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('processing_status', 'completed');

          personalKnowledge = {
            relevant_chunks: searchResults.results.map((result: any) => ({
              chunk_id: result.chunk_id,
              content: result.content,
              document_name: result.document_name,
              relevance_score: result.similarity,
              chunk_metadata: result.chunk_metadata || {}
            })) as KnowledgeSearchResult[],
            knowledge_summary: `Found ${searchResults.results.length} relevant pieces of information from your personal documents.`,
            total_documents: docCount || 0
          };
        } else {
          console.log('ℹ️ No relevant personal knowledge found');
        }
      } catch (knowledgeError) {
        console.error('❌ Error retrieving personal knowledge:', knowledgeError);
      }
    }

    const enhancedMemory: EnhancedPamMemory = {
      ...basicMemory,
      ...(personalKnowledge && { personal_knowledge: personalKnowledge })
    };

    console.log('🧠 Enhanced memory prepared:', {
      hasBasicMemory: Object.keys(basicMemory).length > 0,
      hasPersonalKnowledge: !!personalKnowledge,
      personalKnowledgeChunks: personalKnowledge?.relevant_chunks?.length || 0
    });

    return enhancedMemory;
  } catch (error) {
    console.error('❌ Error getting enhanced PAM memory:', error);
    
    // Fallback to basic memory
    return {
      region,
      travel_style: undefined,
      vehicle_type: undefined,
      preferences: undefined
    };
  }
};
