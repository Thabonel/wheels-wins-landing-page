/**
 * SocialAgent - Community Features Domain Agent
 * Handles social networking, community interactions, and event planning
 */

import { DomainAgent } from './base';
import { ConversationContext, AgentResponse } from '../architectureTypes';
import { supabase } from '@/integrations/supabase/client';

export class SocialAgent extends DomainAgent {
  constructor() {
    super(
      'SocialAgent',
      'Manages community connections, social features, and RV community events'
    );
  }

  protected async loadTools(): Promise<void> {
    // Community Connection Tool
    this.registerTool({
      id: 'community_connect',
      name: 'Community Connect',
      description: 'Finds and connects with other RV travelers',
      category: 'social',
      execute: async (params) => {
        const { userId, location, interests } = params;
        try {
          // Find nearby RV travelers
          const { data, error } = await supabase
            .from('users')
            .select('id, username, location, interests')
            .neq('id', userId)
            .limit(5);
          
          if (error) throw error;
          return { 
            nearbyTravelers: data || [],
            connectionSuggestions: data?.slice(0, 3) || [],
          };
        } catch (error) {
          console.error('Community connection error:', error);
          return { nearbyTravelers: [], error: 'Failed to find connections' };
        }
      },
    });

    // Event Planning Tool
    this.registerTool({
      id: 'event_planner',
      name: 'Event Planner',
      description: 'Plans and manages RV community events',
      category: 'social',
      execute: async (params) => {
        const { eventType, location, date } = params;
        return {
          eventSuggestion: `${eventType} meetup at ${location}`,
          suggestedDate: date || 'Next weekend',
          activities: ['Potluck dinner', 'Campfire stories', 'Group hike'],
          estimatedAttendees: 10,
        };
      },
    });

    // Group Formation Tool
    this.registerTool({
      id: 'group_former',
      name: 'Group Former',
      description: 'Creates and manages travel groups',
      category: 'social',
      execute: async (params) => {
        const { groupName, destination, maxMembers } = params;
        return {
          groupCreated: true,
          groupName: groupName || 'RV Adventure Group',
          destination,
          currentMembers: 1,
          maxMembers: maxMembers || 10,
          joinCode: Math.random().toString(36).substr(2, 9).toUpperCase(),
        };
      },
    });

    // Social Feed Tool
    this.registerTool({
      id: 'social_feed',
      name: 'Social Feed',
      description: 'Manages social feed and community updates',
      category: 'social',
      execute: async (params) => {
        const { userId, action, content } = params;
        if (action === 'post') {
          return {
            posted: true,
            visibility: 'community',
            engagement: { likes: 0, comments: 0 },
          };
        }
        return {
          recentPosts: [
            'Just arrived at Yellowstone! Amazing views!',
            'Looking for travel buddies heading to Grand Canyon',
            'Best RV maintenance tips - check my blog',
          ],
        };
      },
    });
  }

  protected async analyzeRequest(message: string, context: ConversationContext): Promise<any> {
    return {
      hasConnectionRequest: /meet|connect|find.*people|travelers|buddies/i.test(message),
      hasEventRequest: /event|meetup|gathering|party|get.*together/i.test(message),
      hasGroupRequest: /group|caravan|convoy|team|join/i.test(message),
      hasSocialRequest: /post|share|update|feed|community/i.test(message),
      extractedLocation: this.extractLocation(message),
      socialAction: this.identifySocialAction(message),
    };
  }

  protected async selectTools(analysis: any, context: ConversationContext): Promise<string[]> {
    const tools: string[] = [];

    if (analysis.hasConnectionRequest) {
      tools.push('community_connect');
    }
    if (analysis.hasEventRequest) {
      tools.push('event_planner');
    }
    if (analysis.hasGroupRequest) {
      tools.push('group_former');
    }
    if (analysis.hasSocialRequest) {
      tools.push('social_feed');
    }

    // Default to community connect if no specific request
    if (tools.length === 0) {
      tools.push('community_connect');
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

    // Process community connection results
    if (toolResults.has('community_connect')) {
      const connectData = toolResults.get('community_connect');
      if (connectData.nearbyTravelers && connectData.nearbyTravelers.length > 0) {
        response += `I found ${connectData.nearbyTravelers.length} RV travelers in your area! `;
        suggestions.push('Send a connection request', 'View traveler profiles');
      } else {
        response += 'No travelers found nearby right now. ';
        suggestions.push('Expand search radius', 'Post in community feed');
      }
      toolsUsed.push('community_connect');
    }

    // Process event planning results
    if (toolResults.has('event_planner')) {
      const eventData = toolResults.get('event_planner');
      response += `Great idea for a ${eventData.eventSuggestion}! `;
      response += `Expected attendance: ${eventData.estimatedAttendees} people. `;
      suggestions.push(...eventData.activities.slice(0, 2));
      toolsUsed.push('event_planner');
    }

    // Process group formation results
    if (toolResults.has('group_former')) {
      const groupData = toolResults.get('group_former');
      if (groupData.groupCreated) {
        response += `I've created "${groupData.groupName}"! `;
        response += `Share join code: ${groupData.joinCode}. `;
        suggestions.push('Invite specific travelers', 'Set group rules');
      }
      toolsUsed.push('group_former');
    }

    // Process social feed results
    if (toolResults.has('social_feed')) {
      const feedData = toolResults.get('social_feed');
      if (feedData.posted) {
        response += 'Your update has been posted to the community! ';
      } else if (feedData.recentPosts) {
        response += 'Here are recent community updates. ';
        suggestions.push('Like a post', 'Share your journey');
      }
      toolsUsed.push('social_feed');
    }

    // Fallback response
    if (response === '') {
      response = 'I can help you connect with other RV travelers, plan meetups, and stay engaged with the community. What would you like to do?';
      suggestions.push('Find nearby travelers', 'Plan a meetup', 'Create a travel group');
    }

    return {
      response: response.trim(),
      confidence: toolsUsed.length > 0 ? 0.85 : 0.65,
      toolsUsed,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      context: { socialActivity: toolsUsed.length > 0 },
    };
  }

  private extractLocation(message: string): string | null {
    const locationMatch = message.match(/(?:in|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    return locationMatch ? locationMatch[1] : null;
  }

  private identifySocialAction(message: string): string {
    if (/post|share|update/i.test(message)) return 'post';
    if (/connect|meet|find/i.test(message)) return 'connect';
    if (/plan|organize|event/i.test(message)) return 'event';
    if (/group|join|team/i.test(message)) return 'group';
    return 'browse';
  }
}