import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { pamHealthCheck } from '@/services/pamHealthCheck';

interface PamConnectionStatusProps {
  isConnected: boolean;
  showDetails?: boolean;
}

export default function PamConnectionStatus({ isConnected, showDetails = false }: PamConnectionStatusProps) {
  const [healthStatus, setHealthStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [responseTime, setResponseTime] = useState<number>(0);

  useEffect(() => {
    const checkHealth = async () => {
      setHealthStatus('checking');
      const result = await pamHealthCheck.checkHealth();
      setHealthStatus(result.status === 'online' ? 'online' : 'offline');
      setResponseTime(result.responseTime);
    };

    checkHealth();
    
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusText = () => {
    if (healthStatus === 'checking') return 'Checking...';
    if (isConnected && healthStatus === 'online') return 'PAM Online';
    if (healthStatus === 'online' && !isConnected) return 'PAM Backend Available';
    return 'PAM Offline';
  };

  const getStatusVariant = () => {
    if (healthStatus === 'checking') return 'secondary';
    if (isConnected && healthStatus === 'online') return 'default';
    if (healthStatus === 'online') return 'secondary';
    return 'destructive';
  };

  const getIcon = () => {
    if (healthStatus === 'checking') return <Loader2 className="w-3 h-3 animate-spin" />;
    if (isConnected && healthStatus === 'online') return <Wifi className="w-3 h-3" />;
    return <WifiOff className="w-3 h-3" />;
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={getStatusVariant()} className="flex items-center gap-1">
        {getIcon()}
        {getStatusText()}
      </Badge>
      {showDetails && responseTime > 0 && (
        <span className="text-xs text-muted-foreground">
          ({responseTime}ms)
        </span>
      )}
    </div>
  );
}