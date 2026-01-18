
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Monitor } from 'lucide-react';
import { useLoginHistory } from '@/hooks/useLoginHistory';

export const LoginHistory = () => {
  const { loginHistory, loading } = useLoginHistory();

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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Loading login history...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login History</CardTitle>
      </CardHeader>
      <CardContent>
        {loginHistory.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No login history available</p>
        ) : (
          <div className="space-y-4">
            {loginHistory.map((login) => (
              <div key={login.id} className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {getDeviceIcon(login.user_agent)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {format(new Date(login.login_time), 'MMM dd, yyyy')}
                      </span>
                      <span className="text-sm text-gray-500">
                        {format(new Date(login.login_time), 'HH:mm')}
                      </span>
                      <Badge variant={login.success ? 'default' : 'destructive'}>
                        {login.success ? 'Success' : 'Failed'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {getLocationString(login.location_info)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Monitor className="h-3 w-3" />
                        {login.ip_address}
                      </div>
                    </div>
                  </div>
                </div>
                <Badge variant="outline">
                  {login.login_method}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
