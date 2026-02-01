/**
 * Security Service
 * Handles all security-related API communications
 */

import { apiClient } from './apiClient';

export interface SecurityDashboardData {
  overview: {
    total_threats_detected: number;
    active_incidents: number;
    blocked_entities: number;
    threat_level: 'low' | 'medium' | 'high' | 'critical';
    time_range: string;
  };
  threat_statistics: {
    total_events: number;
    blocked_ips: number;
    blocked_users: number;
    threat_types: Record<string, number>;
    severity_levels: Record<string, number>;
  };
  security_metrics: {
    authentication_failures: {
      total_attempts: number;
      failed_attempts: number;
      success_rate: number;
      unique_failed_ips: number;
    };
    privilege_escalation_attempts: {
      total_attempts: number;
      blocked_attempts: number;
      successful_attempts: number;
      unique_sources: number;
    };
    api_rate_limit_violations: {
      total_violations: number;
      unique_ips: number;
      blocked_requests: number;
      most_violated_endpoint: string;
    };
    blocked_ips: number;
    blocked_users: number;
    threat_detection_rate: number;
    incident_response_time: string;
  };
  monitoring_status: {
    active_threats: Array<{
      id: string;
      type: string;
      severity: string;
      source_ip: string;
      started_at: string;
      status: string;
    }>;
    system_health: string;
    monitoring_coverage: number;
    last_threat_detected: string;
    redis_connected: boolean;
    incident_automation_status: string;
  };
  recent_alerts: Array<{
    id: string;
    title: string;
    severity: string;
    timestamp: string;
    source: string;
  }>;
  top_threat_sources: Array<{
    ip: string;
    country: string;
    threat_count: number;
    threat_types: string[];
  }>;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  event_type: string;
  severity: string;
  source_ip: string;
  endpoint: string;
  user_agent: string;
  user_id?: string;
  blocked: boolean;
  details: Record<string, any>;
}

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_entries: number;
    limit: number;
    has_next: boolean;
    has_prev: boolean;
  };
  filters_applied: Record<string, any>;
}

export interface ThreatDetectionData {
  active_threats: Array<{
    id: string;
    type: string;
    severity: string;
    source_ip: string;
    started_at: string;
    status: string;
  }>;
  threat_sources: {
    geographic_distribution: Record<string, number>;
    top_asns: string[];
    known_threat_ips: number;
    tor_exit_nodes: number;
  };
  attack_patterns: {
    common_patterns: string[];
    attack_sophistication: string;
    automated_vs_manual: Record<string, number>;
  };
  geolocation_data: Array<{
    lat: number;
    lng: number;
    threats: number;
    city: string;
  }>;
  blocked_entities: {
    ips: string[];
    users: string[];
  };
  detection_rules: Array<{
    id: string;
    name: string;
    enabled: boolean;
  }>;
  false_positive_rate: number;
  threat_intelligence: {
    ioc_matches: number;
    threat_feeds: string[];
    last_update: string;
  };
}

export interface Incident {
  incident_id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  escalation_level: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  resolved_at?: string;
  source_events: string[];
  affected_assets: string[];
  affected_users: string[];
  estimated_impact?: string;
}

export interface IncidentDetails {
  incident: Incident;
  timeline: Array<{
    timestamp: string;
    event: string;
    actor: string;
  }>;
  related_events: any[];
  response_actions: any[];
  impact_assessment: {
    affected_users: number;
    affected_systems: string[];
    estimated_cost: number;
    reputation_impact: string;
  };
}

export interface IncidentsResponse {
  incidents: Incident[];
  total: number;
  page: number;
  limit: number;
}

class SecurityService {
  private readonly baseUrl = '/api/v1/security';

  /**
   * Get comprehensive security dashboard data
   */
  async getDashboardData(timeRange: string = '24h'): Promise<SecurityDashboardData> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/dashboard`, {
        params: { time_range: timeRange }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      throw new Error('Failed to load security dashboard data');
    }
  }

  /**
   * Get paginated audit log with filters
   */
  async getAuditLog(filters: {
    page?: number;
    limit?: number;
    event_type?: string;
    severity?: string;
    source_ip?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<AuditLogResponse> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/audit-log`, {
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch audit log:', error);
      throw new Error('Failed to load audit log');
    }
  }

  /**
   * Export audit log data
   */
  async exportAuditLog(filters: {
    event_type?: string;
    severity?: string;
    source_ip?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<void> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/audit-log/export`, {
        params: { ...filters, format: 'csv' },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_log_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to export audit log:', error);
      throw new Error('Failed to export audit log');
    }
  }

  /**
   * Get threat detection data
   */
  async getThreatDetectionData(timeRange: string = '24h'): Promise<ThreatDetectionData> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/threat-detection`, {
        params: { time_range: timeRange }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch threat detection data:', error);
      throw new Error('Failed to load threat detection data');
    }
  }

  /**
   * Get incidents with filters and pagination
   */
  async getIncidents(filters: {
    status_filter?: string;
    severity_filter?: string;
    category_filter?: string;
    page?: number;
    limit?: number;
  }): Promise<IncidentsResponse> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/incidents`, {
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
      throw new Error('Failed to load incidents');
    }
  }

  /**
   * Get detailed incident information
   */
  async getIncidentDetails(incidentId: string): Promise<IncidentDetails> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/incidents/${incidentId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch incident details:', error);
      throw new Error('Failed to load incident details');
    }
  }

  /**
   * Update incident status
   */
  async updateIncidentStatus(
    incidentId: string,
    newStatus: string,
    assignedTo?: string
  ): Promise<void> {
    try {
      await apiClient.put(`${this.baseUrl}/incidents/${incidentId}/status`, {
        new_status: newStatus,
        assigned_to: assignedTo
      });
    } catch (error) {
      console.error('Failed to update incident status:', error);
      throw new Error('Failed to update incident status');
    }
  }

  /**
   * Block an IP address manually
   */
  async blockIpAddress(
    ipAddress: string,
    durationMinutes: number = 60,
    reason: string = 'Manual block'
  ): Promise<void> {
    try {
      await apiClient.post(`${this.baseUrl}/block-ip`, {
        ip_address: ipAddress,
        duration_minutes: durationMinutes,
        reason: reason
      });
    } catch (error) {
      console.error('Failed to block IP address:', error);
      throw new Error('Failed to block IP address');
    }
  }

  /**
   * Unblock an IP address
   */
  async unblockIpAddress(ipAddress: string): Promise<void> {
    try {
      await apiClient.delete(`${this.baseUrl}/block-ip/${ipAddress}`);
    } catch (error) {
      console.error('Failed to unblock IP address:', error);
      throw new Error('Failed to unblock IP address');
    }
  }

  /**
   * Export security metrics
   */
  async exportMetrics(format: 'json' | 'csv', timeRange: string = '24h'): Promise<void> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/metrics/export`, {
        params: { format, time_range: timeRange },
        responseType: format === 'json' ? 'json' : 'blob'
      });

      if (format === 'json') {
        // Handle JSON export
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `security_metrics_${timeRange}_${new Date().getTime()}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Handle CSV export
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `security_metrics_${timeRange}_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Failed to export metrics:', error);
      throw new Error('Failed to export security metrics');
    }
  }

  /**
   * Get security statistics
   */
  async getSecurityStatistics(): Promise<any> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/statistics`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch security statistics:', error);
      throw new Error('Failed to load security statistics');
    }
  }

  /**
   * Test security endpoints connectivity
   */
  async testConnectivity(): Promise<boolean> {
    try {
      await this.getDashboardData('1h');
      return true;
    } catch (error) {
      console.error('Security service connectivity test failed:', error);
      return false;
    }
  }
}

export const securityService = new SecurityService();