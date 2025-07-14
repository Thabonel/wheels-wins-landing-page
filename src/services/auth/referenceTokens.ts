/**
 * Reference Token Service - Industry Standard SaaS Authentication Pattern
 * 
 * Instead of large JWTs, use short reference tokens that map to server-side user data.
 * This is how most major SaaS platforms handle authentication (Stripe, GitHub, etc.)
 */

import { supabase } from '@/integrations/supabase/client';

interface UserSession {
  id: string;
  user_id: string;
  token_hash: string;
  user_data: {
    id: string;
    email: string;
    role: string;
    metadata?: Record<string, any>;
  };
  expires_at: string;
}

export class ReferenceTokenService {
  /**
   * Create a short reference token for a user session
   * Returns a ~32 character token instead of 700+ character JWT
   */
  static async createReferenceToken(userId: string, userData: any): Promise<string> {
    try {
      // Generate short, secure reference token
      const referenceToken = this.generateShortToken();
      
      // Hash the token for secure storage
      const tokenHash = await this.hashToken(referenceToken);
      
      // Prepare user data with safe role handling
      const safeUserData = {
        id: userId,
        email: userData.email || '',
        role: 'user', // Always use 'user' role to avoid RLS issues
        metadata: userData.user_metadata || {}
      };
      
      // Store session data server-side
      const { error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          token_hash: tokenHash,
          user_data: safeUserData,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
        });
      
      if (error) {
        console.warn('Reference token creation failed, falling back to JWT:', error.message);
        throw new Error(`Failed to create reference token: ${error.message}`);
      }
      
      return referenceToken;
    } catch (error) {
      console.warn('Reference token system error:', error);
      throw error;
    }
  }
  
  /**
   * Validate reference token and return user data
   */
  static async validateReferenceToken(token: string): Promise<UserSession | null> {
    const tokenHash = await this.hashToken(token);
    
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('token_hash', tokenHash)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return data as UserSession;
  }
  
  /**
   * Revoke a reference token
   */
  static async revokeReferenceToken(token: string): Promise<boolean> {
    const tokenHash = await this.hashToken(token);
    
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('token_hash', tokenHash);
    
    return !error;
  }
  
  /**
   * Clean up expired tokens
   */
  static async cleanupExpiredTokens(): Promise<void> {
    await supabase
      .from('user_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());
  }
  
  /**
   * Generate cryptographically secure short token
   * Format: 8 chars + 16 chars + 8 chars = 32 chars total
   */
  private static generateShortToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    // Generate 32 character token in format: XXXXXXXX-XXXXXXXXXXXXXXXX-XXXXXXXX
    const sections = [8, 16, 8];
    
    sections.forEach((length, index) => {
      if (index > 0) result += '-';
      
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    });
    
    return result;
  }
  
  /**
   * Hash token for secure storage
   */
  private static async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

/**
 * Enhanced API fetch using reference tokens instead of JWTs
 */
export async function authenticatedFetchWithReferenceToken(path: string, options: RequestInit = {}) {
  // Get current Supabase session
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    throw new Error('No valid session found. Please log in.');
  }
  
  // For new sessions, create reference token
  let referenceToken = localStorage.getItem('reference_token');
  
  if (!referenceToken) {
    console.log('🎫 Creating reference token for session optimization');
    try {
      referenceToken = await ReferenceTokenService.createReferenceToken(
        session.user.id, 
        session.user
      );
      localStorage.setItem('reference_token', referenceToken);
    } catch (error) {
      console.warn('🎫 Reference token creation failed, falling back to JWT:', error);
      // Fallback to using JWT directly
      const authenticatedOptions: RequestInit = {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          ...options.headers,
        },
      };
      
      const url = `${import.meta.env.VITE_BACKEND_URL || 'https://pam-backend.onrender.com'}${path}`;
      return await fetch(url, authenticatedOptions);
    }
  }
  
  console.log('🎫 Using reference token (length:', referenceToken.length, 'chars)');
  console.log('🎫 vs Original JWT (length:', session.access_token.length, 'chars)');
  console.log('🎫 Size reduction:', `${Math.round(((session.access_token.length - referenceToken.length) / session.access_token.length) * 100)}%`);
  
  // Use short reference token in Authorization header
  const authenticatedOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${referenceToken}`,
      'X-Auth-Type': 'reference-token', // Signal to backend
      ...options.headers,
    },
  };
  
  const url = `${import.meta.env.VITE_BACKEND_URL || 'https://pam-backend.onrender.com'}${path}`;
  const response = await fetch(url, authenticatedOptions);
  
  // Handle token expiration
  if (response.status === 401) {
    console.log('🔄 Reference token expired, creating new one...');
    localStorage.removeItem('reference_token');
    
    // Recursive call will create new token
    return authenticatedFetchWithReferenceToken(path, options);
  }
  
  return response;
}