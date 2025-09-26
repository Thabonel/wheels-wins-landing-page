import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { authenticatedFetch } from '@/services/api';
import APIKeyManagement from './APIKeyManagement';
import { PAMConnectionDiagnostic } from './PAMConnectionDiagnostic';
import { 
  Activity, 
  BarChart3, 
  DollarSign, 
  Eye, 
  RefreshCw, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  ExternalLink
} from 'lucide-react';

interface ObservabilityData {
  status: string;
  platforms: {
    gemini: boolean;
    anthropic: boolean;
    langfuse: boolean;
  };
  key_metrics: {
    total_observations: number;
    success_rate: string;
    total_llm_calls: number;
    estimated_cost: string;
    avg_response_time: string;
  };
  session_duration: string;
  last_updated: string;
}

interface DetailedMetrics {
  session_info: {
    duration_seconds: number;
    observability_status: any;
  };
  observation_metrics: {
    total_observations: number;
    successful_observations: number;
    failed_observations: number;
    success_rate_percent: number;
    avg_response_time_seconds: number;
  };
  llm_metrics: {
    total_calls: number;
    total_tokens: number;
    estimated_cost_usd: number;
    avg_tokens_per_call: number;
    avg_cost_per_call: number;
  };
  platform_status: any;
}

interface HealthStatus {
  overall_status: string;
  platforms: {
    [key: string]: {
      status: string;
      configured: boolean;
      ready: boolean;
    };
  };
  issues: string[];
}

export default function ObservabilityDashboard() {
  const [dashboardData, setDashboardData] = useState<ObservabilityData | null>(null);
  const [detailedMetrics, setDetailedMetrics] = useState<DetailedMetrics | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const fetchData = async (showToast = false) => {
    try {
      setRefreshing(true);
      
      const [dashboardResponse, metricsResponse, healthResponse] = await Promise.all([
        authenticatedFetch('/api/v1/observability/dashboard-data'),
        authenticatedFetch('/api/v1/observability/metrics'),
        authenticatedFetch('/api/v1/observability/health')
      ]);

      // Check for authentication/authorization errors
      let hasAccessError = false;
      
      if (!dashboardResponse.ok && dashboardResponse.status === 403) {
        console.warn('Admin access required for observability data');
        hasAccessError = true;
        setAccessDenied(true);
      } else if (dashboardResponse.ok) {
        const dashboardResult = await dashboardResponse.json();
        setDashboardData(dashboardResult.data.summary);
        setAccessDenied(false);
      }

      if (!metricsResponse.ok && metricsResponse.status === 403) {
        console.warn('Admin access required for metrics data');
        hasAccessError = true;
      } else if (metricsResponse.ok) {
        const metricsResult = await metricsResponse.json();
        setDetailedMetrics(metricsResult.data);
      }

      if (!healthResponse.ok && healthResponse.status === 403) {
        console.warn('Admin access required for health data');
        hasAccessError = true;
      } else if (healthResponse.ok) {
        const healthResult = await healthResponse.json();
        setHealthStatus(healthResult.data);
      }
      
      // Only show the error toast once if there's an access error
      if (hasAccessError && showToast) {
        toast.error('Admin access required to view observability data');
      }

      if (showToast && dashboardResponse.ok) {
        toast.success('Observability data refreshed');
      }
    } catch (error) {
      console.error('Failed to fetch observability data:', error);
      // Only show error toast if it's not an authentication issue
      if (error instanceof Error && !error.message.includes('403')) {
        toast.error('Failed to load observability data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const initializeObservability = async () => {
    try {
      const response = await authenticatedFetch('/api/v1/observability/initialize', {
        method: 'POST'
      });

      if (response.status === 403) {
        toast.error('Admin access required to initialize observability');
        return;
      }

      if (response.ok) {
        toast.success('Observability platforms initialized');
        fetchData(false);
      } else {
        const error = await response.json();
        toast.error(`Failed to initialize: ${error.detail}`);
      }
    } catch (error) {
      console.error('Failed to initialize observability:', error);
      if (error instanceof Error && !error.message.includes('403')) {
        toast.error('Failed to initialize observability');
      }
    }
  };

  const resetMetrics = async () => {
    try {
      const response = await authenticatedFetch('/api/v1/observability/reset-metrics', {
        method: 'POST'
      });

      if (response.status === 403) {
        toast.error('Admin access required to reset metrics');
        return;
      }

      if (response.ok) {
        toast.success('Metrics reset successfully');
        fetchData(false);
      } else {
        toast.error('Failed to reset metrics');
      }
    } catch (error) {
      console.error('Failed to reset metrics:', error);
      if (error instanceof Error && !error.message.includes('403')) {
        toast.error('Failed to reset metrics');
      }
    }
  };

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'active':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'unhealthy':
      case 'disabled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (ready: boolean) => {
    return ready ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading observability data...</span>
      </div>
    );
  }

  // Show access denied message if user doesn't have admin privileges
  if (accessDenied) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">AI Agent Observability</h2>
            <p className="text-gray-600">Monitor and manage AI agent performance across platforms</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4 py-8">
              <AlertTriangle className="h-12 w-12 text-yellow-500" />
              <h3 className="text-lg font-semibold">Admin Access Required</h3>
              <p className="text-gray-600 text-center max-w-md">
                You need admin privileges to view observability data. 
                Please contact your system administrator for access.
              </p>
              <Button
                onClick={() => fetchData(true)}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">AI Agent Observability</h2>
          <p className="text-gray-600">Monitor and manage AI agent performance across platforms</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={initializeObservability}
            variant="outline"
            size="sm"
          >
            <Settings className="h-4 w-4" />
            Initialize
          </Button>
          <Button
            onClick={resetMetrics}
            variant="outline"
            size="sm"
          >
            <BarChart3 className="h-4 w-4" />
            Reset Metrics
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Activity className="h-4 w-4 mr-2" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(dashboardData.status)}`} />
                <span className="capitalize font-medium">{dashboardData.status}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Eye className="h-4 w-4 mr-2" />
                Observations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.key_metrics.total_observations}</div>
              <p className="text-sm text-gray-600">Success: {dashboardData.key_metrics.success_rate}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                LLM Calls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.key_metrics.total_llm_calls}</div>
              <p className="text-sm text-gray-600">Avg: {dashboardData.key_metrics.avg_response_time}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Estimated Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.key_metrics.estimated_cost}</div>
              <p className="text-sm text-gray-600">Session: {dashboardData.session_duration}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Platform Status */}
      {healthStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Platform Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(healthStatus.platforms).map(([platform, status]) => (
                <div key={platform} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(status.ready)}
                    <span className="font-medium capitalize">{platform}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={status.ready ? "default" : "destructive"}>
                      {status.status}
                    </Badge>
                    {platform === 'openai' && (
                      <a
                        href="https://platform.openai.com/usage"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700"
                        title="OpenAI API Console"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    {platform === 'gemini' && (
                      <a
                        href="https://makersuite.google.com/app/usage"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700"
                        title="Gemini API Console"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    {platform === 'anthropic' && (
                      <a
                        href="https://console.anthropic.com/usage"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700"
                        title="Anthropic Console (Fallback)"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    {platform === 'langfuse' && (
                      <a
                        href="https://cloud.langfuse.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {healthStatus.issues && healthStatus.issues.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                  <span className="font-medium text-yellow-800">Issues Detected</span>
                </div>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {healthStatus.issues.map((issue, index) => (
                    <li key={index}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* PAM Diagnostics and Detailed Metrics */}
      <Tabs defaultValue="diagnostics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="diagnostics">PAM Diagnostics</TabsTrigger>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="llm">LLM Analytics</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="diagnostics" className="space-y-4">
          <PAMConnectionDiagnostic />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {detailedMetrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Observation Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Observations:</span>
                    <span className="font-medium">{detailedMetrics.observation_metrics.total_observations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Successful:</span>
                    <span className="font-medium text-green-600">{detailedMetrics.observation_metrics.successful_observations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed:</span>
                    <span className="font-medium text-red-600">{detailedMetrics.observation_metrics.failed_observations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Success Rate:</span>
                    <span className="font-medium">{detailedMetrics.observation_metrics.success_rate_percent.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Response Time:</span>
                    <span className="font-medium">{detailedMetrics.observation_metrics.avg_response_time_seconds.toFixed(3)}s</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Session Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-medium">{Math.floor(detailedMetrics.session_info.duration_seconds / 60)}m {Math.floor(detailedMetrics.session_info.duration_seconds % 60)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Observations/min:</span>
                    <span className="font-medium">{(detailedMetrics.observation_metrics.total_observations / (detailedMetrics.session_info.duration_seconds / 60)).toFixed(1)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No performance metrics available yet. Initialize observability to start collecting data.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="llm" className="space-y-4">
          {detailedMetrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    API Calls
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{detailedMetrics.llm_metrics.total_calls}</div>
                  <p className="text-sm text-gray-600">Total LLM API calls</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Token Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{detailedMetrics.llm_metrics.total_tokens.toLocaleString()}</div>
                  <p className="text-sm text-gray-600">Avg: {detailedMetrics.llm_metrics.avg_tokens_per_call.toFixed(0)} per call</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Cost Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">${detailedMetrics.llm_metrics.estimated_cost_usd.toFixed(4)}</div>
                  <p className="text-sm text-gray-600">Avg: ${detailedMetrics.llm_metrics.avg_cost_per_call.toFixed(4)} per call</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No LLM analytics available yet. Initialize observability to start collecting data.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Platform Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    Configure your observability platforms through environment variables or the settings panel.
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium">Anthropic Claude</h4>
                      <p className="text-sm text-gray-600">API key required for Claude AI tracking</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium">Langfuse</h4>
                      <p className="text-sm text-gray-600">Secret and public keys for advanced LLM observability</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        <TabsContent value="keys" className="space-y-4">
          <APIKeyManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}