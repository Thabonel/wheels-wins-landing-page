import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// Service role client for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables for admin client');
}

// Admin client with service role - bypasses RLS
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Types for admin operations
export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
  phone?: string;
  role: 'user' | 'admin' | 'moderator' | 'premium';
  status: 'active' | 'suspended' | 'pending';
  region?: string;
  full_name?: string;
  nickname?: string;
  posts_count: number;
  app_metadata: any;
  user_metadata: any;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  full_name?: string;
  role: 'user' | 'admin' | 'moderator' | 'premium';
  status: 'active' | 'suspended' | 'pending';
  region?: string;
  email_confirm?: boolean;
}

export interface UpdateUserRequest {
  full_name?: string;
  nickname?: string;
  role?: 'user' | 'admin' | 'moderator' | 'premium';
  status?: 'active' | 'suspended' | 'pending';
  region?: string;
  email?: string;
  phone?: string;
}

// Admin permission validation
export class AdminAuthError extends Error {
  constructor(message: string, public statusCode: number = 403) {
    super(message);
    this.name = 'AdminAuthError';
  }
}

// Validate user has admin permissions
export async function validateAdminUser(userToken: string): Promise<{ userId: string; userRole: string }> {
  try {
    // Verify the JWT token using regular Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    
    // Set the auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
    
    if (authError || !user) {
      throw new AdminAuthError('Invalid authentication token', 401);
    }

    // Check user's role in profiles table using admin client
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, status')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new AdminAuthError('User profile not found', 404);
    }

    if (profile.status !== 'active') {
      throw new AdminAuthError('User account is not active', 403);
    }

    if (!['admin', 'moderator'].includes(profile.role)) {
      throw new AdminAuthError('Insufficient permissions - admin or moderator role required', 403);
    }

    return {
      userId: user.id,
      userRole: profile.role
    };

  } catch (error) {
    if (error instanceof AdminAuthError) {
      throw error;
    }
    console.error('Admin validation error:', error);
    throw new AdminAuthError('Authentication validation failed', 500);
  }
}

// Admin operations service
export class AdminUserService {
  
  // Get all users with full details
  static async getAllUsers(): Promise<AdminUser[]> {
    try {
      // Get auth users from Supabase auth
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (authError) {
        throw new Error(`Failed to fetch auth users: ${authError.message}`);
      }

      // Get profiles and user_profiles
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select(`
          user_id,
          email,
          role,
          status,
          region,
          created_at,
          user_profiles (
            full_name,
            nickname
          )
        `);

      if (profilesError) {
        throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
      }

      // Get post counts
      const { data: posts, error: postsError } = await supabaseAdmin
        .from('social_posts')
        .select('user_id');

      const postCounts = posts?.reduce((acc, post) => {
        acc[post.user_id] = (acc[post.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Combine auth users with profile data
      const users: AdminUser[] = authUsers.users.map(authUser => {
        const profile = profiles?.find(p => p.user_id === authUser.id);
        const userProfile = Array.isArray(profile?.user_profiles) ? profile.user_profiles[0] : profile?.user_profiles;
        
        return {
          id: authUser.id,
          email: authUser.email || profile?.email || '',
          created_at: authUser.created_at,
          email_confirmed_at: authUser.email_confirmed_at,
          last_sign_in_at: authUser.last_sign_in_at,
          phone: authUser.phone,
          role: profile?.role || 'user',
          status: profile?.status || 'pending',
          region: profile?.region || userProfile?.region,
          full_name: userProfile?.full_name,
          nickname: userProfile?.nickname,
          posts_count: postCounts[authUser.id] || 0,
          app_metadata: authUser.app_metadata,
          user_metadata: authUser.user_metadata
        };
      });

      return users;

    } catch (error) {
      console.error('Get all users error:', error);
      throw error;
    }
  }

  // Create new user
  static async createUser(userData: CreateUserRequest): Promise<AdminUser> {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: userData.email_confirm ?? true,
        user_metadata: {
          full_name: userData.full_name
        }
      });

      if (authError || !authData.user) {
        throw new Error(`Failed to create auth user: ${authError?.message}`);
      }

      // Create profile record
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          email: userData.email,
          role: userData.role,
          status: userData.status,
          region: userData.region
        });

      if (profileError) {
        // Cleanup auth user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Failed to create user profile: ${profileError.message}`);
      }

      // Create user profile record if full name provided
      if (userData.full_name) {
        const { error: userProfileError } = await supabaseAdmin
          .from('user_profiles')
          .insert({
            user_id: authData.user.id,
            full_name: userData.full_name,
            email: userData.email,
            region: userData.region
          });

        if (userProfileError) {
          console.warn('Failed to create user_profiles record:', userProfileError.message);
          // Don't fail the entire operation for this
        }
      }

      // Return the created user
      return {
        id: authData.user.id,
        email: userData.email,
        created_at: authData.user.created_at,
        email_confirmed_at: authData.user.email_confirmed_at,
        last_sign_in_at: authData.user.last_sign_in_at,
        role: userData.role,
        status: userData.status,
        region: userData.region,
        full_name: userData.full_name,
        posts_count: 0,
        app_metadata: authData.user.app_metadata,
        user_metadata: authData.user.user_metadata
      };

    } catch (error) {
      console.error('Create user error:', error);
      throw error;
    }
  }

  // Update user
  static async updateUser(userId: string, updates: UpdateUserRequest): Promise<AdminUser> {
    try {
      // Update auth user if email is being changed
      if (updates.email) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          email: updates.email
        });

        if (authError) {
          throw new Error(`Failed to update auth user: ${authError.message}`);
        }
      }

      // Update user metadata
      if (updates.full_name) {
        const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { full_name: updates.full_name }
        });

        if (metadataError) {
          console.warn('Failed to update user metadata:', metadataError.message);
        }
      }

      // Update profile
      const profileUpdates: any = {};
      if (updates.role) profileUpdates.role = updates.role;
      if (updates.status) profileUpdates.status = updates.status;
      if (updates.region) profileUpdates.region = updates.region;
      if (updates.email) profileUpdates.email = updates.email;

      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update(profileUpdates)
          .eq('user_id', userId);

        if (profileError) {
          throw new Error(`Failed to update profile: ${profileError.message}`);
        }
      }

      // Update user_profiles
      const userProfileUpdates: any = {};
      if (updates.full_name) userProfileUpdates.full_name = updates.full_name;
      if (updates.nickname) userProfileUpdates.nickname = updates.nickname;
      if (updates.region) userProfileUpdates.region = updates.region;
      if (updates.email) userProfileUpdates.email = updates.email;

      if (Object.keys(userProfileUpdates).length > 0) {
        const { error: userProfileError } = await supabaseAdmin
          .from('user_profiles')
          .upsert({
            user_id: userId,
            ...userProfileUpdates
          });

        if (userProfileError) {
          console.warn('Failed to update user_profiles:', userProfileError.message);
        }
      }

      // Get and return updated user
      const users = await this.getAllUsers();
      const updatedUser = users.find(u => u.id === userId);
      
      if (!updatedUser) {
        throw new Error('User not found after update');
      }

      return updatedUser;

    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  }

  // Delete user
  static async deleteUser(userId: string): Promise<void> {
    try {
      // Delete related records first to maintain referential integrity
      const deleteOperations = [
        // Delete user-related data
        supabaseAdmin.from('user_profiles').delete().eq('user_id', userId),
        supabaseAdmin.from('profiles').delete().eq('user_id', userId),
        supabaseAdmin.from('social_posts').delete().eq('user_id', userId),
        supabaseAdmin.from('expenses').delete().eq('user_id', userId),
        supabaseAdmin.from('maintenance_records').delete().eq('user_id', userId),
        supabaseAdmin.from('fuel_log').delete().eq('user_id', userId),
        supabaseAdmin.from('calendar_events').delete().eq('user_id', userId),
        supabaseAdmin.from('budgets').delete().eq('user_id', userId),
        // Add other user-related tables as needed
      ];

      // Execute all deletions
      await Promise.allSettled(deleteOperations);

      // Finally delete the auth user
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      
      if (authError) {
        throw new Error(`Failed to delete auth user: ${authError.message}`);
      }

    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  }

  // Bulk operations
  static async bulkUpdateStatus(userIds: string[], status: 'active' | 'suspended' | 'pending'): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ status })
        .in('user_id', userIds);

      if (error) {
        throw new Error(`Failed to bulk update status: ${error.message}`);
      }
    } catch (error) {
      console.error('Bulk update status error:', error);
      throw error;
    }
  }

  static async bulkUpdateRole(userIds: string[], role: 'user' | 'admin' | 'moderator' | 'premium'): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ role })
        .in('user_id', userIds);

      if (error) {
        throw new Error(`Failed to bulk update role: ${error.message}`);
      }
    } catch (error) {
      console.error('Bulk update role error:', error);
      throw error;
    }
  }

  static async bulkDelete(userIds: string[]): Promise<void> {
    try {
      // Delete in batches to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        await Promise.all(batch.map(id => this.deleteUser(id)));
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      throw error;
    }
  }

  // Get user statistics
  static async getUserStats(): Promise<{
    total: number;
    active: number;
    suspended: number;
    pending: number;
    admins: number;
    moderators: number;
    premium: number;
    recentSignups: number; // Last 7 days
  }> {
    try {
      const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('role, status, created_at');

      if (error) {
        throw new Error(`Failed to get user stats: ${error.message}`);
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const stats = {
        total: profiles?.length || 0,
        active: profiles?.filter(p => p.status === 'active').length || 0,
        suspended: profiles?.filter(p => p.status === 'suspended').length || 0,
        pending: profiles?.filter(p => p.status === 'pending').length || 0,
        admins: profiles?.filter(p => p.role === 'admin').length || 0,
        moderators: profiles?.filter(p => p.role === 'moderator').length || 0,
        premium: profiles?.filter(p => p.role === 'premium').length || 0,
        recentSignups: profiles?.filter(p => new Date(p.created_at || '') > sevenDaysAgo).length || 0
      };

      return stats;

    } catch (error) {
      console.error('Get user stats error:', error);
      throw error;
    }
  }
}
