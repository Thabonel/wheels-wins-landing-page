/**
 * Voice Status Monitor - Real-time Voice System Health Dashboard
 * 
 * Provides comprehensive monitoring and control for the PAM voice system:
 * - Real-time status indicators and health metrics
 * - Error recovery controls and circuit breaker status
 * - Performance analytics and engine reliability stats
 * - Manual recovery triggers and fallback mode controls
 * - User-friendly error explanations and recommendations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Activity, 
  Settings, 
  AlertCircle,
  TrendingUp,
  Volume2,
  VolumeX,
  Zap,
  Shield,
  Clock,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useVoice } from '@/hooks/useVoice';
import { useVoiceErrorRecovery, VoiceError } from '@/hooks/useVoiceErrorRecovery';

interface VoiceStatusMonitorProps {
  showAdvanced?: boolean;
  compact?: boolean;
  onStatusChange?: (status: string) => void;
}

const STATUS_COLORS = {
  healthy: 'bg-green-500',
  degraded: 'bg-yellow-500',
  failed: 'bg-red-500',
  recovering: 'bg-blue-500'
} as const;

const STATUS_LABELS = {
  healthy: 'Voice Active',
  degraded: 'Limited Voice',
  failed: 'Voice Unavailable',
  recovering: 'Restoring Voice...'
} as const;

const CATEGORY_ICONS = {
  network: '🌐',
  audio_playback: '🔊',
  tts_synthesis: '🎤',
  permission: '🔒',
  browser_compatibility: '🌍',
  api_quota: '📊',
  authentication: '🔐',
  unknown: '❓'
} as const;

export const VoiceStatusMonitor: React.FC<VoiceStatusMonitorProps> = ({
  showAdvanced = false,
  compact = false,
  onStatusChange
}) => {
  const voice = useVoice();
  const recovery = useVoiceErrorRecovery();
  
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [healthCheck, setHealthCheck] = useState<{
    status: 'healthy' | 'degraded' | 'failed';
    issues: string[];
    recommendations: string[];
  } | null>(null);
  const [isPerformingHealthCheck, setIsPerformingHealthCheck] = useState(false);

  // Notify parent of status changes
  useEffect(() => {
    onStatusChange?.(recovery.status);
  }, [recovery.status, onStatusChange]);

  // Perform health check
  const runHealthCheck = useCallback(async () => {
    setIsPerformingHealthCheck(true);
    try {
      const result = await recovery.performHealthCheck();
      setHealthCheck(result);
    } catch (error) {
      console.error('Health check failed:', error);
      setHealthCheck({
        status: 'failed',
        issues: ['Health check failed'],
        recommendations: ['Try manual recovery']
      });
    } finally {
      setIsPerformingHealthCheck(false);
    }
  }, [recovery]);

  // Auto health check on mount and status changes
  useEffect(() => {
    runHealthCheck();
    const interval = setInterval(runHealthCheck, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [runHealthCheck, recovery.status]);

  // Manual recovery handler
  const handleManualRecovery = useCallback(async () => {
    const success = await recovery.triggerRecovery('Voice system test');
    if (success) {
      console.log('✅ Manual recovery successful');
      await runHealthCheck();
    } else {
      console.error('❌ Manual recovery failed');
    }
  }, [recovery, runHealthCheck]);

  // Render status indicator
  const renderStatusIndicator = () => (
    <div className="flex items-center gap-2">
      <div 
        className={`w-3 h-3 rounded-full ${STATUS_COLORS[recovery.status]} ${
          recovery.isRecovering ? 'animate-pulse' : ''
        }`} 
      />
      <span className="text-sm font-medium">
        {STATUS_LABELS[recovery.status]}
      </span>
      {recovery.isRecovering && (
        <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
      )}
    </div>
  );

  // Render fallback mode badge
  const renderFallbackMode = () => {
    if (recovery.fallbackMode === 'none') return null;
    
    const color = recovery.fallbackMode === 'text-only' ? 'yellow' : 'red';
    const icon = recovery.fallbackMode === 'text-only' ? <VolumeX className="w-3 h-3" /> : <XCircle className="w-3 h-3" />;
    
    return (
      <Badge variant="outline" className={`border-${color}-500 text-${color}-700`}>
        {icon}
        {recovery.fallbackMode === 'text-only' ? 'Text Only' : 'Silent'}
      </Badge>
    );
  };

  // Render recent errors
  const renderRecentErrors = () => {
    if (recovery.recentErrors.length === 0) {
      return (
        <div className="text-sm text-green-600 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          No recent errors
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {recovery.recentErrors.slice(0, 3).map((error: VoiceError) => (
          <div key={error.id} className="p-2 bg-red-50 rounded border-l-4 border-red-400">
            <div className="flex items-start gap-2">
              <span className="text-lg">{CATEGORY_ICONS[error.category]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-800 capitalize">
                  {error.category.replace('_', ' ')} Error
                </p>
                <p className="text-xs text-red-600 truncate" title={error.message}>
                  {error.message}
                </p>
                <p className="text-xs text-red-500">
                  {new Date(error.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <Badge variant="outline" size="sm">
                {error.severity}
              </Badge>
            </div>
          </div>
        ))}
        {recovery.recentErrors.length > 3 && (
          <p className="text-xs text-gray-500">
            +{recovery.recentErrors.length - 3} more errors
          </p>
        )}
      </div>
    );
  };

  // Render metrics
  const renderMetrics = () => {
    const { metrics } = recovery;
    const successRate = metrics.totalErrors > 0 
      ? ((metrics.totalErrors - metrics.totalErrors + metrics.recoveredErrors) / metrics.totalErrors) * 100 
      : 100;

    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm">
              <span>Recovery Rate</span>
              <span>{successRate.toFixed(1)}%</span>
            </div>
            <Progress value={successRate} className="h-2" />
          </div>
          
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>Total Errors:</span>
              <span className="font-medium">{metrics.totalErrors}</span>
            </div>
            <div className="flex justify-between">
              <span>Recovered:</span>
              <span className="font-medium text-green-600">{metrics.recoveredErrors}</span>
            </div>
            <div className="flex justify-between">
              <span>Text Fallbacks:</span>
              <span className="font-medium text-yellow-600">{metrics.textOnlyFallbacks}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm">
              <span>Avg Recovery</span>
              <span>{metrics.avgRecoveryTime.toFixed(0)}ms</span>
            </div>
          </div>
          
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>Queue Size:</span>
              <span className="font-medium">{voice.queueSize}</span>
            </div>
            <div className="flex justify-between">
              <span>Is Playing:</span>
              <span className={`font-medium ${voice.isPlaying ? 'text-blue-600' : 'text-gray-500'}`}>
                {voice.isPlaying ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Engine Status:</span>
              <span className="font-medium text-blue-600">
                {voice.isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render circuit breakers
  const renderCircuitBreakers = () => {
    const breakers = Object.entries(recovery.circuitBreakers);
    
    if (breakers.length === 0) {
      return (
        <div className="text-sm text-gray-500">No circuit breakers configured</div>
      );
    }

    return (
      <div className="space-y-2">
        {breakers.map(([engine, breaker]) => (
          <div key={engine} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div>
              <span className="text-sm font-medium capitalize">{engine} Engine</span>
              <div className="text-xs text-gray-500">
                Failures: {breaker.failureCount}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {breaker.isOpen ? (
                <>
                  <Badge variant="destructive">Open</Badge>
                  <Shield className="w-4 h-4 text-red-500" />
                </>
              ) : (
                <>
                  <Badge variant="default">Closed</Badge>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render health recommendations
  const renderHealthRecommendations = () => {
    if (!healthCheck || healthCheck.recommendations.length === 0) return null;

    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Recommendations</AlertTitle>
        <AlertDescription>
          <ul className="list-disc pl-5 space-y-1">
            {healthCheck.recommendations.map((rec, index) => (
              <li key={index} className="text-sm">{rec}</li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    );
  };

  // Compact view
  if (compact && !isExpanded) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {renderStatusIndicator()}
              {renderFallbackMode()}
            </div>
            <div className="flex items-center gap-2">
              {recovery.recentErrors.length > 0 && (
                <Badge variant="destructive" size="sm">
                  {recovery.recentErrors.length} errors
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(true)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Voice System Status
          </CardTitle>
          {compact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
            >
              ×
            </Button>
          )}
        </div>
        <div className="flex items-center justify-between">
          {renderStatusIndicator()}
          <div className="flex items-center gap-2">
            {renderFallbackMode()}
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRecovery}
              disabled={recovery.isRecovering}
            >
              {recovery.isRecovering ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Recover
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          
          <TabsContent value="status" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2">System Health</h4>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={runHealthCheck}
                    disabled={isPerformingHealthCheck}
                  >
                    {isPerformingHealthCheck ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Activity className="w-4 h-4" />
                    )}
                    Check Health
                  </Button>
                  {healthCheck && (
                    <Badge 
                      variant={healthCheck.status === 'healthy' ? 'default' : 'destructive'}
                    >
                      {healthCheck.status}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Voice Controls</h4>
                <div className="flex items-center gap-2">
                  <Button
                    variant={voice.isMuted ? "destructive" : "outline"}
                    size="sm"
                    onClick={voice.mute}
                  >
                    {voice.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    {voice.isMuted ? 'Unmute' : 'Mute'}
                  </Button>
                </div>
              </div>
            </div>
            
            {renderHealthRecommendations()}
            
            {healthCheck?.issues && healthCheck.issues.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Issues Detected</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5">
                    {healthCheck.issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="errors" className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-3">Recent Errors</h4>
              {renderRecentErrors()}
            </div>
          </TabsContent>
          
          <TabsContent value="metrics" className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Performance Metrics
              </h4>
              {renderMetrics()}
            </div>
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Circuit Breakers
              </h4>
              {renderCircuitBreakers()}
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-3">Debug Information</h4>
              <div className="text-xs font-mono bg-gray-50 p-3 rounded space-y-1">
                <div>Connection ID: {voice.connectionId || 'Not connected'}</div>
                <div>Agent Status: {voice.status}</div>
                <div>Settings Loaded: {voice.settingsLoaded ? 'Yes' : 'No'}</div>
                <div>Queue Size: {voice.queueSize}</div>
                <div>Is Listening: {voice.isListening ? 'Yes' : 'No'}</div>
                <div>Is Speaking: {voice.isSpeaking ? 'Yes' : 'No'}</div>
                <div>Fallback Mode: {recovery.fallbackMode}</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default VoiceStatusMonitor;