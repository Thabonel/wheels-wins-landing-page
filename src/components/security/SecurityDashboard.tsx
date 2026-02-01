import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Activity,
  TrendingUp,
  Users,
  Globe,
  Lock,
  Eye,
  Settings,
  Download
} from 'lucide-react';
import { AuditLog } from './AuditLog';
import { ThreatDetection } from './ThreatDetection';
import { IncidentResponse } from './IncidentResponse';
import { securityService } from '@/services/securityService';
import { useAuth } from '@/context/AuthContext';

interface SecurityMetrics {
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

export function SecurityDashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadDashboardData();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      setError(null);
      const data = await securityService.getDashboardData(timeRange);
      setDashboardData(data);
    } catch (err) {
      setError('Failed to load security dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportMetrics = async (format: 'json' | 'csv') => {
    try {
      await securityService.exportMetrics(format, timeRange);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'medium': return <Activity className="h-4 w-4 text-yellow-600" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'critical': return <Shield className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading security dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!dashboardData) {
    return (
      <Alert className="m-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>No security data available</AlertDescription>
      </Alert>
    );
  }

  const { overview, threat_statistics, security_metrics, monitoring_status, recent_alerts, top_threat_sources } = dashboardData;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <h1 className="text-3xl font-bold">Security Monitoring Dashboard</h1>
        </div>

        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => handleExportMetrics('json')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          <Button variant="outline" onClick={loadDashboardData}>
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Threats Detected</p>
                <p className="text-2xl font-bold">{overview.total_threats_detected}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Incidents</p>
                <p className="text-2xl font-bold">{overview.active_incidents}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Blocked Entities</p>
                <p className="text-2xl font-bold">{overview.blocked_entities}</p>
              </div>
              <Lock className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Threat Level</p>
                <Badge className={getThreatLevelColor(overview.threat_level)}>
                  {overview.threat_level.toUpperCase()}
                </Badge>
              </div>
              {getSeverityIcon(overview.threat_level)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${monitoring_status.system_health === 'healthy' ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-sm font-medium">System Health: {monitoring_status.system_health}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${monitoring_status.redis_connected ? 'bg-green-400' : 'bg-yellow-400'}`} />
              <span className="text-sm font-medium">Redis: {monitoring_status.redis_connected ? 'Connected' : 'Disconnected'}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${monitoring_status.incident_automation_status === 'active' ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-sm font-medium">Automation: {monitoring_status.incident_automation_status}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Monitoring Coverage</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${monitoring_status.monitoring_coverage}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{monitoring_status.monitoring_coverage}%</span>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600">Last Threat Detected</p>
              <p className="text-sm font-medium mt-1">
                {monitoring_status.last_threat_detected ?
                  new Date(monitoring_status.last_threat_detected).toLocaleString() :
                  'No recent threats'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Authentication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Success Rate</span>
              <span className="font-medium">{security_metrics.authentication_failures.success_rate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Failed Attempts</span>
              <span className="font-medium">{security_metrics.authentication_failures.failed_attempts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Unique IPs</span>
              <span className="font-medium">{security_metrics.authentication_failures.unique_failed_ips}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">API Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Rate Violations</span>
              <span className="font-medium">{security_metrics.api_rate_limit_violations.total_violations}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Blocked Requests</span>
              <span className="font-medium">{security_metrics.api_rate_limit_violations.blocked_requests}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Detection Rate</span>
              <span className="font-medium">{security_metrics.threat_detection_rate}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Response Time</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Avg Response</span>
              <span className="font-medium">{security_metrics.incident_response_time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Blocked IPs</span>
              <span className="font-medium">{security_metrics.blocked_ips}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Blocked Users</span>
              <span className="font-medium">{security_metrics.blocked_users}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recent_alerts.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No recent alerts</p>
            ) : (
              recent_alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getSeverityIcon(alert.severity)}
                    <div>
                      <p className="font-medium">{alert.title}</p>
                      <p className="text-xs text-gray-500">{alert.source} • {new Date(alert.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <Badge className={getThreatLevelColor(alert.severity)}>
                    {alert.severity}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Threat Sources */}
      <Card>
        <CardHeader>
          <CardTitle>Top Threat Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {top_threat_sources.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No threat sources identified</p>
            ) : (
              top_threat_sources.map((source, index) => (
                <div key={source.ip} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-gray-600" />
                    <div>
                      <p className="font-medium">{source.ip}</p>
                      <p className="text-xs text-gray-500">
                        {source.country} • {source.threat_count} threats • {source.threat_types.join(', ')}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{source.threat_count}</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="threats" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="threats">Threat Detection</TabsTrigger>
          <TabsTrigger value="incidents">Incident Response</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="threats" className="mt-6">
          <ThreatDetection />
        </TabsContent>

        <TabsContent value="incidents" className="mt-6">
          <IncidentResponse />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <AuditLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}