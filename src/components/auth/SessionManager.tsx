import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Clock,
  LogOut,
  Shield,
  Trash2
} from 'lucide-react';

interface SessionInfo {
  session_id: string;
  created_at: string;
  last_activity: string;
  device_info: {
    user_agent?: string;
    ip_address?: string;
    x_forwarded_for?: string;
  } | null;
  ip_address?: string;
  user_agent?: string;
}

interface SessionListResponse {
  sessions: SessionInfo[];
  current_session_id?: string;
}

export function SessionManager() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/sessions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load sessions');
      }

      const data: SessionListResponse = await response.json();
      setSessions(data.sessions);
      setCurrentSessionId(data.current_session_id || null);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    setActionLoading(sessionId);
    setError(null);

    try {
      const response = await fetch(`/api/v1/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to revoke session');
      }

      // Remove session from list
      setSessions(prev => prev.filter(s => s.session_id !== sessionId));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke session');
    } finally {
      setActionLoading(null);
    }
  };

  const logoutAllDevices = async () => {
    setActionLoading('all');
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/logout?all_devices=true', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to logout from all devices');
      }

      // Redirect to login after logging out all sessions
      localStorage.removeItem('authToken');
      window.location.href = '/login';

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to logout from all devices');
      setActionLoading(null);
    }
  };

  const getDeviceIcon = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="h-4 w-4" />;
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return <Tablet className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const getDeviceDescription = (session: SessionInfo) => {
    const userAgent = session.device_info?.user_agent || session.user_agent || '';
    const ipAddress = session.device_info?.ip_address || session.ip_address || 'Unknown IP';

    // Parse browser and OS from user agent
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';

    if (userAgent) {
      // Browser detection
      if (userAgent.includes('Chrome')) browser = 'Chrome';
      else if (userAgent.includes('Firefox')) browser = 'Firefox';
      else if (userAgent.includes('Safari')) browser = 'Safari';
      else if (userAgent.includes('Edge')) browser = 'Edge';

      // OS detection
      if (userAgent.includes('Windows')) os = 'Windows';
      else if (userAgent.includes('Mac OS')) os = 'macOS';
      else if (userAgent.includes('Linux')) os = 'Linux';
      else if (userAgent.includes('Android')) os = 'Android';
      else if (userAgent.includes('iOS')) os = 'iOS';
    }

    return { browser, os, ipAddress };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Active Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Loading sessions...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Active Sessions
        </CardTitle>
        <CardDescription>
          Manage your active sessions across all devices. Revoke access from devices you no longer use.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
          </div>

          {sessions.length > 1 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={actionLoading === 'all'}
                  className="text-red-600 hover:text-red-700"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {actionLoading === 'all' ? 'Logging out...' : 'Logout All Devices'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Logout from all devices?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will end all your sessions and you'll need to log in again on all devices.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={logoutAllDevices}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Logout All Devices
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <div className="space-y-3">
          {sessions.map((session) => {
            const { browser, os, ipAddress } = getDeviceDescription(session);
            const isCurrentSession = session.session_id === currentSessionId;

            return (
              <div
                key={session.session_id}
                className={`border rounded-lg p-4 space-y-3 ${
                  isCurrentSession ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getDeviceIcon(session.device_info?.user_agent || session.user_agent || '')}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {browser} on {os}
                        </span>
                        {isCurrentSession && (
                          <Badge variant="secondary" className="text-xs">
                            Current Session
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {ipAddress}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last active {formatDate(session.last_activity)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {!isCurrentSession && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoading === session.session_id}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke this session?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will end the session for "{browser} on {os}" and the device will
                            need to log in again. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => revokeSession(session.session_id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Revoke Session
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>

                <div className="text-xs text-gray-500">
                  Session started {formatDate(session.created_at)}
                </div>
              </div>
            );
          })}
        </div>

        {sessions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No active sessions found
          </div>
        )}

        <div className="pt-4 border-t text-xs text-gray-600">
          <p>
            Sessions are automatically removed after 24 hours of inactivity.
            If you notice any suspicious sessions, revoke them immediately and change your password.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}