import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface UserProfile {
  user_id: string;
  bio?: string;
  interests?: string[];
  travel_style?: string;
  rig_type?: string;
  experience_level?: string;
  social_preferences?: any;
  privacy_settings?: any;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GroupEvent {
  id: string;
  group_id: string;
  title: string;
  description?: string;
  event_type: 'meetup' | 'trip' | 'workshop' | 'social' | 'maintenance' | 'other';
  start_date: string;
  end_date?: string;
  location?: any;
  max_attendees?: number;
  requirements?: string[];
  cost_per_person?: number;
  organizer_id: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  visibility: 'public' | 'group_only' | 'invite_only';
  attendee_count?: number;
  user_attendance?: string;
}

export interface ModerationReport {
  id: string;
  content_type: string;
  content_id: string;
  reason: string;
  category: 'spam' | 'inappropriate' | 'harassment' | 'misinformation' | 'copyright' | 'other';
  description?: string;
  priority_level: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed' | 'escalated';
}

export function useCommunityFeatures() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Social Networking Functions
  const sendFriendRequest = async (addresseeId: string) => {
    if (!user) return false;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('user_friendships')
        .insert({
          requester_id: user.id,
          addressee_id: addresseeId,
          status: 'pending'
        });

      if (error) throw error;
      
      // Log social interaction
      await supabase
        .from('social_interactions')
        .insert({
          user_id: user.id,
          target_user_id: addresseeId,
          interaction_type: 'friend_request'
        });

      toast.success('Friend request sent!');
      return true;
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error('Failed to send friend request');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const respondToFriendRequest = async (friendshipId: string, accept: boolean) => {
    if (!user) return false;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('user_friendships')
        .update({ 
          status: accept ? 'accepted' : 'declined',
          updated_at: new Date().toISOString()
        })
        .eq('id', friendshipId);

      if (error) throw error;
      
      toast.success(accept ? 'Friend request accepted!' : 'Friend request declined');
      return true;
    } catch (error) {
      console.error('Error responding to friend request:', error);
      toast.error('Failed to respond to friend request');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const followUser = async (userId: string) => {
    if (!user) return false;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('user_follows')
        .insert({
          follower_id: user.id,
          following_id: userId
        });

      if (error) throw error;
      
      // Log social interaction
      await supabase
        .from('social_interactions')
        .insert({
          user_id: user.id,
          target_user_id: userId,
          interaction_type: 'follow'
        });

      toast.success('Now following user!');
      return true;
    } catch (error) {
      console.error('Error following user:', error);
      toast.error('Failed to follow user');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unfollowUser = async (userId: string) => {
    if (!user) return false;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);

      if (error) throw error;
      
      toast.success('Unfollowed user');
      return true;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      toast.error('Failed to unfollow user');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Group Event Functions
  const createGroupEvent = async (eventData: {
    group_id: string;
    title: string;
    description?: string;
    event_type?: 'meetup' | 'trip' | 'workshop' | 'social' | 'maintenance' | 'other';
    start_date: string;
    end_date?: string;
    location?: any;
    max_attendees?: number;
    requirements?: string[];
    cost_per_person?: number;
    status?: 'draft' | 'published' | 'cancelled' | 'completed';
    visibility?: 'public' | 'group_only' | 'invite_only';
  }) => {
    if (!user) return null;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('group_events')
        .insert({
          group_id: eventData.group_id,
          title: eventData.title,
          description: eventData.description,
          event_type: eventData.event_type || 'meetup',
          start_date: eventData.start_date,
          end_date: eventData.end_date,
          location: eventData.location,
          max_attendees: eventData.max_attendees,
          requirements: eventData.requirements,
          cost_per_person: eventData.cost_per_person,
          organizer_id: user.id,
          status: eventData.status || 'draft',
          visibility: eventData.visibility || 'group_only'
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Event created successfully!');
      return data;
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const joinEvent = async (eventId: string, status: 'interested' | 'going' | 'maybe' = 'going') => {
    if (!user) return false;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('event_attendees')
        .insert({
          event_id: eventId,
          user_id: user.id,
          status
        });

      if (error) throw error;
      
      toast.success(`Marked as ${status} for this event!`);
      return true;
    } catch (error) {
      console.error('Error joining event:', error);
      toast.error('Failed to join event');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateEventAttendance = async (eventId: string, status: 'interested' | 'going' | 'not_going' | 'maybe') => {
    if (!user) return false;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('event_attendees')
        .update({ status })
        .eq('event_id', eventId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast.success('Attendance updated!');
      return true;
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error('Failed to update attendance');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Content Moderation Functions
  const reportContent = async (
    contentType: string,
    contentId: string,
    reason: string,
    category: 'spam' | 'inappropriate' | 'harassment' | 'misinformation' | 'copyright' | 'other',
    description?: string
  ) => {
    if (!user) return false;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('moderation_queue')
        .insert({
          content_type: contentType,
          content_id: contentId,
          reported_by: user.id,
          reason,
          category,
          description
        });

      if (error) throw error;
      
      toast.success('Content reported successfully');
      return true;
    } catch (error) {
      console.error('Error reporting content:', error);
      toast.error('Failed to report content');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getUserTrustScore = async (userId?: string) => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return null;
    
    try {
      const { data, error } = await supabase
        .from('trust_scores')
        .select('score, factors, last_calculated')
        .eq('user_id', targetUserId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      return data;
    } catch (error) {
      console.error('Error fetching trust score:', error);
      return null;
    }
  };

  const calculateUserTrustScore = async (userId?: string) => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return null;
    
    try {
      const { data, error } = await supabase
        .rpc('calculate_trust_score', { user_id: targetUserId });

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error calculating trust score:', error);
      return null;
    }
  };

  // Get user's friendships
  const getUserFriendships = async () => {
    if (!user) return [];
    
    try {
      const { data, error } = await supabase
        .from('user_friendships')
        .select('*')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching friendships:', error);
      return [];
    }
  };

  // Get user's social interactions
  const getSocialInteractions = async (limit = 50) => {
    if (!user) return [];
    
    try {
      const { data, error } = await supabase
        .from('social_interactions')
        .select('*')
        .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching social interactions:', error);
      return [];
    }
  };

  return {
    loading,
    // Social Networking
    sendFriendRequest,
    respondToFriendRequest,
    followUser,
    unfollowUser,
    getUserFriendships,
    getSocialInteractions,
    // Group Events
    createGroupEvent,
    joinEvent,
    updateEventAttendance,
    // Content Moderation
    reportContent,
    getUserTrustScore,
    calculateUserTrustScore
  };
}