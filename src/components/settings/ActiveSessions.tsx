import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, MapPin, Clock, Trash2, Shield } from 'lucide-react';
import { useActiveSessions } from '@/hooks/useActiveSessions';

export const ActiveSessions = () => {
  const { activeSessions, loading, terminateSession, terminateAllOtherSessions } = useActiveSessions();

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent?.toLowerCase().includes('mobile')) {
      return '📱';
    }
    if (userAgent?.toLowerCase().includes('tablet')) {
      return '💻';
    }
    return '🖥️';
  };

  const getLocationString = (locationInfo: any) => {
    if (!locationInfo) return 'Unknown location';
    return `${locationInfo.city || 'Unknown'}, ${locationInfo.country || 'Unknown'}`;
  };

  const getDeviceName = (userAgent: string, deviceInfo: any) => {
    if (deviceInfo?.device_name) return deviceInfo.device_name;
    
    // Extract browser name from user agent
    if (userAgent?.includes('Chrome')) return 'Chrome Browser';
    if (userAgent?.includes('Firefox')) return 'Firefox Browser';
    if (userAgent?.includes('Safari')) return 'Safari Browser';
    if (userAgent?.includes('Edge')) return 'Edge Browser';
    
    return 'Unknown Device';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Loading active sessions...</div>
        </CardContent>
      </Card>
    );
  }

  const currentSession = activeSessions.find(session => session.is_current);
  const otherSessions = activeSessions.filter(session => !session.is_current);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Active Sessions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeSessions.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No active sessions found</p>
        ) : (
          <>
            {/* Current Session */}
            {currentSession && (
              <div className="border rounded-lg p-4 bg-green-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {getDeviceIcon(currentSession.user_agent)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {getDeviceName(currentSession.user_agent, currentSession.device_info)}
                        </span>
                        <Badge variant="secondary">Current Session</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {getLocationString(currentSession.location_info)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Monitor className="h-3 w-3" />
                          {currentSession.ip_address}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(currentSession.last_activity), 'MMM dd, HH:mm')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Other Sessions */}
            {otherSessions.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Other Sessions ({otherSessions.length})</h3>
                  {otherSessions.length > 1 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={terminateAllOtherSessions}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Sign Out All Others
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {otherSessions.map((session) => (
                    <div key={session.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">
                            {getDeviceIcon(session.user_agent)}
                          </div>
                          <div>
                            <div className="font-medium">
                              {getDeviceName(session.user_agent, session.device_info)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {getLocationString(session.location_info)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Monitor className="h-3 w-3" />
                                {session.ip_address}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Last active: {format(new Date(session.last_activity), 'MMM dd, HH:mm')}
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => terminateSession(session.session_id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Sign Out
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {otherSessions.length === 0 && currentSession && (
              <p className="text-gray-500 text-center py-4">
                No other active sessions
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
