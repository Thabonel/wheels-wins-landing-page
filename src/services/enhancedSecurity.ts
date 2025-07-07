import { supabase } from '@/integrations/supabase/client';

export interface MFASetup {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

export interface SecurityEvent {
  type: 'login_attempt' | 'mfa_enabled' | 'suspicious_activity' | 'data_access' | 'password_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export class EnhancedSecurity {
  private static instance: EnhancedSecurity;
  
  static getInstance(): EnhancedSecurity {
    if (!EnhancedSecurity.instance) {
      EnhancedSecurity.instance = new EnhancedSecurity();
    }
    return EnhancedSecurity.instance;
  }

  // Multi-Factor Authentication
  async enableMFA(userId: string): Promise<MFASetup> {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'PAM Mobile App'
      });

      if (error) throw error;

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Save MFA settings
      await supabase
        .from('mfa_settings')
        .upsert({
          user_id: userId,
          enabled: true,
          backup_codes: backupCodes
        });

      await this.logSecurityEvent(userId, {
        type: 'mfa_enabled',
        severity: 'medium',
        metadata: { method: 'totp' }
      });

      return {
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        backupCodes
      };
    } catch (error) {
      console.error('MFA setup failed:', error);
      throw error;
    }
  }

  async verifyMFA(factorId: string, code: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        code,
        challengeId: '' // Get from challenge
      });

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('MFA verification failed:', error);
      return false;
    }
  }

  async disableMFA(userId: string, factorId: string): Promise<void> {
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId
      });

      if (error) throw error;

      await supabase
        .from('mfa_settings')
        .update({ enabled: false })
        .eq('user_id', userId);

      await this.logSecurityEvent(userId, {
        type: 'mfa_enabled',
        severity: 'medium',
        metadata: { action: 'disabled' }
      });
    } catch (error) {
      console.error('MFA disable failed:', error);
      throw error;
    }
  }

  // Threat Detection
  async detectSuspiciousActivity(userId: string, activity: any): Promise<boolean> {
    try {
      const threats = await Promise.all([
        this.checkRapidRequests(userId),
        this.checkUnusualLocation(userId, activity.location),
        this.checkDeviceFingerprint(userId, activity.device),
        this.checkTimePattern(userId)
      ]);

      const isSuspicious = threats.some(threat => threat.suspicious);
      
      if (isSuspicious) {
        await this.logSecurityEvent(userId, {
          type: 'suspicious_activity',
          severity: 'high',
          metadata: {
            threats: threats.filter(t => t.suspicious),
            activity
          }
        });

        // Trigger additional security measures
        await this.triggerSecurityAlert(userId, threats);
      }

      return isSuspicious;
    } catch (error) {
      console.error('Threat detection failed:', error);
      return false;
    }
  }

  private async checkRapidRequests(userId: string): Promise<{ suspicious: boolean; reason?: string }> {
    const { count } = await supabase
      .from('user_interactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('timestamp', new Date(Date.now() - 5 * 60 * 1000).toISOString());

    return {
      suspicious: (count || 0) > 100,
      reason: 'Rapid request pattern detected'
    };
  }

  private async checkUnusualLocation(userId: string, currentLocation: any): Promise<{ suspicious: boolean; reason?: string }> {
    if (!currentLocation) return { suspicious: false };

    const { data: recentSessions } = await supabase
      .from('analytics_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Simple location analysis - check if location is drastically different
    const lastKnownLocation = recentSessions?.[0];
    if (!lastKnownLocation) return { suspicious: false };

    // This would need actual geolocation analysis
    return { suspicious: false };
  }

  private async checkDeviceFingerprint(userId: string, device: any): Promise<{ suspicious: boolean; reason?: string }> {
    const { data: knownDevices } = await supabase
      .from('analytics_sessions')
      .select('user_agent, device_type')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const isKnownDevice = knownDevices?.some(d => 
      d.user_agent === device.userAgent || d.device_type === device.type
    );

    return {
      suspicious: !isKnownDevice && knownDevices && knownDevices.length > 0,
      reason: 'Unrecognized device'
    };
  }

  private async checkTimePattern(userId: string): Promise<{ suspicious: boolean; reason?: string }> {
    const currentHour = new Date().getHours();
    
    const { data: sessions } = await supabase
      .from('analytics_sessions')
      .select('session_start')
      .eq('user_id', userId)
      .order('session_start', { ascending: false })
      .limit(20);

    if (!sessions || sessions.length < 5) return { suspicious: false };

    const usualHours = sessions.map(s => new Date(s.session_start).getHours());
    const isUnusualTime = !usualHours.some(hour => Math.abs(hour - currentHour) <= 2);

    return {
      suspicious: isUnusualTime,
      reason: 'Unusual access time'
    };
  }

  // Security Logging
  async logSecurityEvent(userId: string, event: SecurityEvent): Promise<void> {
    try {
      await supabase.rpc('log_security_event', {
        p_user_id: userId,
        p_event_type: event.type,
        p_severity: event.severity,
        p_metadata: event.metadata || {}
      });
    } catch (error) {
      console.error('Security logging failed:', error);
    }
  }

  async trackFailedLogin(email: string, reason: string): Promise<void> {
    try {
      await supabase
        .from('failed_login_attempts')
        .insert({
          email,
          ip_address: await this.getClientIP(),
          user_agent: navigator.userAgent,
          reason
        });

      // Check if account should be locked
      const attempts = await supabase.rpc('check_failed_login_attempts', {
        p_email: email,
        p_ip_address: await this.getClientIP()
      });

      if (attempts.data && attempts.data > 5) {
        await this.logSecurityEvent(null, {
          type: 'suspicious_activity',
          severity: 'critical',
          metadata: { reason: 'Multiple failed login attempts', email, attempts: attempts.data }
        });
      }
    } catch (error) {
      console.error('Failed login tracking failed:', error);
    }
  }

  // Rate Limiting
  async checkRateLimit(userId: string, endpoint: string, maxRequests: number = 100): Promise<boolean> {
    try {
      const result = await supabase.rpc('check_rate_limit', {
        user_id: userId,
        window_start: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        limit_count: maxRequests
      });

      if (result.data && !result.data.allow) {
        await this.logSecurityEvent(userId, {
          type: 'suspicious_activity',
          severity: 'medium',
          metadata: { reason: 'Rate limit exceeded', endpoint, count: result.data.count }
        });
      }

      return result.data?.allow || false;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return true; // Allow on error
    }
  }

  // Helper methods
  private generateBackupCodes(): string[] {
    return Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 8).toUpperCase()
    );
  }

  private async triggerSecurityAlert(userId: string, threats: any[]): Promise<void> {
    // In a real implementation, this would:
    // - Send alert emails
    // - Trigger webhooks
    // - Lock account if severity is high
    // - Notify administrators
    
    console.warn('Security Alert:', { userId, threats });
  }

  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return '0.0.0.0';
    }
  }

  // Audit Logging
  async logAuditEvent(
    userId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    oldValues?: any,
    newValues?: any
  ): Promise<void> {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          old_values: oldValues,
          new_values: newValues,
          ip_address: await this.getClientIP(),
          user_agent: navigator.userAgent
        });
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }
}

export const enhancedSecurity = EnhancedSecurity.getInstance();