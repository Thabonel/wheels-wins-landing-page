import React, { useState, useEffect } from 'react';
import { CalendarDeleteLogger } from '@/utils/calendarDeleteDebug';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CalendarDeleteDebugPanelProps {
  show: boolean;
  onClose: () => void;
}

export const CalendarDeleteDebugPanel: React.FC<CalendarDeleteDebugPanelProps> = ({ show, onClose }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!show || !isLive) return;

    const interval = setInterval(() => {
      const latestLogs = CalendarDeleteLogger.getLastOperation();
      if (latestLogs.length > 0) {
        setLogs([...latestLogs]);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [show, isLive]);

  const clearLogs = () => {
    CalendarDeleteLogger.clearLogs();
    setLogs([]);
  };

  const getStepColor = (step: string) => {
    switch (step) {
      case 'start': return 'bg-blue-100 text-blue-800';
      case 'auth_check': return 'bg-yellow-100 text-yellow-800';
      case 'user_validation': return 'bg-green-100 text-green-800';
      case 'db_operation': return 'bg-purple-100 text-purple-800';
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeviceInfo = () => {
    if (logs.length === 0) return null;
    return logs[0]?.device;
  };

  const getLastError = () => {
    const errorLog = logs.find(l => l.step === 'error');
    return errorLog?.error;
  };

  const getAuthInfo = () => {
    const authLog = logs.find(l => l.step === 'auth_check');
    return authLog?.auth;
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-semibold">
              📊 Calendar Delete Diagnostics
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant={isLive ? "default" : "secondary"}>
                {isLive ? "🔴 Live" : "⏸️ Paused"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLive(!isLive)}
              >
                {isLive ? "Pause" : "Resume"}
              </Button>
              <Button variant="outline" size="sm" onClick={clearLogs}>
                Clear
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Device Information */}
          {getDeviceInfo() && (
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Device Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>User Agent:</strong> {getDeviceInfo()?.userAgent}
                  </div>
                  <div>
                    <strong>iOS Device:</strong> {getDeviceInfo()?.isIOS ? '✅ Yes' : '❌ No'}
                  </div>
                  <div>
                    <strong>PWA Mode:</strong> {getDeviceInfo()?.isPWA ? '✅ Yes' : '❌ No'}
                  </div>
                  <div>
                    <strong>Storage Isolation:</strong> {getDeviceInfo()?.hasStorageIsolation ? '⚠️ Yes' : '✅ No'}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Authentication Information */}
          {getAuthInfo() && (
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Authentication Status</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Has User:</strong> {getAuthInfo()?.hasUser ? '✅ Yes' : '❌ No'}
                  </div>
                  <div>
                    <strong>Auth Tokens Found:</strong> {getAuthInfo()?.authTokenFound ? '✅ Yes' : '❌ No'}
                  </div>
                  <div>
                    <strong>User ID:</strong> {getAuthInfo()?.userId ? `${getAuthInfo()?.userId.substring(0, 8)}...` : 'None'}
                  </div>
                  <div>
                    <strong>User Email:</strong> {getAuthInfo()?.userEmail || 'None'}
                  </div>
                  {getAuthInfo()?.authError && (
                    <div className="col-span-2">
                      <strong>Auth Error:</strong> <span className="text-red-600">{getAuthInfo()?.authError}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Information */}
          {getLastError() && (
            <Card className="mb-4 border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-800">❌ Error Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Message:</strong> <span className="text-red-600">{getLastError()?.message}</span>
                  </div>
                  {getLastError()?.code && (
                    <div>
                      <strong>Code:</strong> {getLastError()?.code}
                    </div>
                  )}
                  <div>
                    <strong>Type:</strong> {getLastError()?.type}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step-by-Step Log */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                🔍 Step-by-Step Operation Log ({logs.length} steps)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No deletion attempts yet. Try deleting a calendar event to see diagnostic information.
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Badge className={getStepColor(log.step)}>
                        {log.step.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <div className="flex-1 text-sm">
                        <div className="font-medium">
                          Step {index + 1}: {log.step.replace('_', ' ')}
                        </div>
                        <div className="text-gray-600 mt-1">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                        {log.step === 'start' && (
                          <div className="mt-2">
                            Event ID: {log.request?.eventId}
                          </div>
                        )}
                        {log.step === 'error' && log.error && (
                          <div className="mt-2 p-2 bg-red-50 rounded text-red-700">
                            {log.error.message}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="mt-4 bg-blue-50">
            <CardContent className="pt-4">
              <div className="text-sm text-blue-800">
                <strong>📋 Instructions:</strong>
                <ol className="mt-2 list-decimal list-inside space-y-1">
                  <li>Navigate to your calendar</li>
                  <li>Try to delete an event (it should fail on iPad)</li>
                  <li>Watch the diagnostic information appear above</li>
                  <li>Take a screenshot of the error details for analysis</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarDeleteDebugPanel;