/**
 * PAM Unavailable State UI - Day 3 Fallback Implementation
 * Comprehensive unavailable state with alternative actions and clear messaging
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Bot,
  RefreshCw,
  MessageSquare,
  WifiOff,
  Clock,
  Settings,
  HelpCircle,
  ExternalLink,
  Phone,
  Mail
} from 'lucide-react';

interface PAMUnavailableStateProps {
  reason: 'offline' | 'error' | 'maintenance' | 'overload' | 'configuration';
  lastActive?: string;
  retryAvailable?: boolean;
  onRetry?: () => void;
  estimatedRecovery?: string;
  alternativeActions?: boolean;
}

const PAMUnavailableState: React.FC<PAMUnavailableStateProps> = ({
  reason = 'error',
  lastActive,
  retryAvailable = true,
  onRetry,
  estimatedRecovery,
  alternativeActions = true
}) => {
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  // Auto-retry countdown
  useEffect(() => {
    if (retryCountdown > 0) {
      const timer = setTimeout(() => setRetryCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (retryCountdown === 0 && retryAvailable && onRetry) {
      // Auto-retry when countdown reaches 0
      setTimeout(onRetry, 1000);
    }
  }, [retryCountdown, retryAvailable, onRetry]);

  const getReasonConfig = (reason: string) => {
    switch (reason) {
      case 'offline':
        return {
          icon: WifiOff,
          title: 'PAM is Offline',
          description: 'Your internet connection appears to be down, so PAM cannot connect.',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          severity: 'medium' as const
        };

      case 'maintenance':
        return {
          icon: Settings,
          title: 'PAM Under Maintenance',
          description: 'PAM is currently being updated with new features and improvements.',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          severity: 'low' as const
        };

      case 'overload':
        return {
          icon: Clock,
          title: 'PAM is Busy',
          description: 'PAM is experiencing high demand right now. Please wait a moment.',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          severity: 'medium' as const
        };

      case 'configuration':
        return {
          icon: Settings,
          title: 'PAM Setup Required',
          description: 'PAM needs to be configured before it can assist you.',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          severity: 'high' as const
        };

      default: // 'error'
        return {
          icon: Bot,
          title: 'PAM is Temporarily Unavailable',
          description: 'We\'re experiencing technical difficulties with PAM. Our team is working to restore service.',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          severity: 'high' as const
        };
    }
  };

  const config = getReasonConfig(reason);
  const IconComponent = config.icon;

  const getAlternativeActions = () => {
    const actions = [];

    // Common alternative actions
    actions.push({
      label: 'Browse Features',
      description: 'Explore what you can do without PAM',
      icon: ExternalLink,
      action: () => window.location.href = '/features'
    });

    if (reason === 'offline') {
      actions.push({
        label: 'Work Offline',
        description: 'Continue using basic features',
        icon: WifiOff,
        action: () => window.location.href = '/offline'
      });
    }

    if (reason === 'configuration') {
      actions.push({
        label: 'Setup PAM',
        description: 'Configure PAM to start using it',
        icon: Settings,
        action: () => window.location.href = '/settings'
      });
    }

    // Always include help and mock mode
    actions.push(
      {
        label: 'Get Help',
        description: 'View help documentation',
        icon: HelpCircle,
        action: () => window.location.href = '/help'
      },
      {
        label: 'Try Mock Mode',
        description: 'Test PAM features in demo mode',
        icon: Bot,
        action: () => window.location.href = '/pam-dev-test'
      }
    );

    return actions;
  };

  const startRetryCountdown = (seconds: number) => {
    setRetryCountdown(seconds);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Main Status Card */}
      <Card className={`${config.borderColor} ${config.bgColor}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full bg-white ${config.borderColor} border`}>
                <IconComponent className={`h-6 w-6 ${config.color}`} />
              </div>
              <div>
                <CardTitle className={`text-xl ${config.color}`}>
                  {config.title}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {config.description}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={config.color}>
              {config.severity === 'high' ? 'High Priority' :
               config.severity === 'medium' ? 'Medium Priority' : 'Low Priority'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Status Details */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-white rounded-lg border">
            <div>
              <span className="text-sm text-gray-600">Status:</span>
              <span className={`ml-2 font-medium ${config.color}`}>Unavailable</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Last Active:</span>
              <span className="ml-2 text-sm">{lastActive || 'Unknown'}</span>
            </div>
            {estimatedRecovery && (
              <>
                <div>
                  <span className="text-sm text-gray-600">Est. Recovery:</span>
                  <span className="ml-2 text-sm">{estimatedRecovery}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Reason:</span>
                  <span className="ml-2 text-sm capitalize">{reason}</span>
                </div>
              </>
            )}
          </div>

          {/* Retry Section */}
          {retryAvailable && (
            <div className="p-3 bg-white rounded-lg border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Connection Recovery</h4>
                {retryCountdown > 0 && (
                  <Badge variant="secondary">
                    Auto-retry in {formatTime(retryCountdown)}
                  </Badge>
                )}
              </div>

              {retryCountdown > 0 ? (
                <div className="space-y-2">
                  <Progress
                    value={((30 - retryCountdown) / 30) * 100}
                    className="h-2"
                  />
                  <p className="text-sm text-gray-600">
                    PAM will automatically attempt to reconnect...
                  </p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={onRetry}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again Now
                  </Button>
                  <Button
                    onClick={() => startRetryCountdown(30)}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    Auto-retry in 30s
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Alternative Actions */}
          {alternativeActions && (
            <div className="p-3 bg-white rounded-lg border">
              <h4 className="font-medium text-gray-900 mb-3">What You Can Do</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {getAlternativeActions().map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className="p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <action.icon className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-sm">{action.label}</div>
                        <div className="text-xs text-gray-600">{action.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Technical Details (Expandable) */}
          <div className="border-t pt-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <HelpCircle className="h-4 w-4" />
              {showDetails ? 'Hide' : 'Show'} Technical Details
            </button>

            {showDetails && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                <div className="space-y-2">
                  <div>
                    <strong>Issue Type:</strong> {reason}
                  </div>
                  <div>
                    <strong>Browser:</strong> {navigator.userAgent.split(' ')[0]}
                  </div>
                  <div>
                    <strong>WebSocket Support:</strong> {'WebSocket' in window ? 'Available' : 'Not Available'}
                  </div>
                  <div>
                    <strong>Network:</strong> {navigator.onLine ? 'Online' : 'Offline'}
                  </div>
                  <div>
                    <strong>Timestamp:</strong> {new Date().toISOString()}
                  </div>
                </div>

                {reason === 'error' && (
                  <div className="mt-3 p-2 bg-white rounded border">
                    <strong>Troubleshooting:</strong>
                    <ul className="mt-1 list-disc list-inside text-xs space-y-1">
                      <li>Check your internet connection</li>
                      <li>Try refreshing the page</li>
                      <li>Clear browser cache and cookies</li>
                      <li>Try using a different browser</li>
                      <li>Contact support if the problem persists</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contact Support */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-sm text-gray-900">Need Help?</h5>
                <p className="text-xs text-gray-600">Contact our support team</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email
                </Button>
                <Button size="sm" variant="outline" className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  Chat
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Strip */}
      <div className="mt-4 p-3 bg-gray-100 rounded-lg border">
        <div className="flex items-center justify-center gap-4 text-sm">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Page
          </button>
          <span className="text-gray-400">•</span>
          <button
            onClick={() => window.location.href = '/pam-dev-test'}
            className="flex items-center gap-1 text-green-600 hover:text-green-800"
          >
            <Bot className="h-4 w-4" />
            Try Demo Mode
          </button>
          <span className="text-gray-400">•</span>
          <button
            onClick={() => window.location.href = '/status'}
            className="flex items-center gap-1 text-purple-600 hover:text-purple-800"
          >
            <ExternalLink className="h-4 w-4" />
            Service Status
          </button>
        </div>
      </div>
    </div>
  );
};

export default PAMUnavailableState;