/**
 * Trial Limits - Shows usage against trial limits
 * Displays progress bars and upgrade prompts when approaching limits
 */

import React, { useEffect, useState } from 'react';
import { useTrial } from '@/context/TrialContext';
import { trialService, type LimitType, type TrialLimit } from '@/services/trialService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  HardDrive, 
  Route, 
  FileText, 
  AlertTriangle,
  TrendingUp,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LimitConfig {
  type: LimitType;
  title: string;
  icon: React.ReactNode;
  unit: string;
  formatValue: (value: number) => string;
  description: string;
}

const limitConfigs: LimitConfig[] = [
  {
    type: 'devices',
    title: 'Connected Devices',
    icon: <Smartphone className="h-4 w-4" />,
    unit: 'devices',
    formatValue: (value) => value.toString(),
    description: 'Sync across phone, tablet, laptop'
  },
  {
    type: 'storage',
    title: 'Storage Used',
    icon: <HardDrive className="h-4 w-4" />,
    unit: 'GB',
    formatValue: (value) => `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`,
    description: 'Photos, documents, route data'
  },
  {
    type: 'routes',
    title: 'Saved Routes',
    icon: <Route className="h-4 w-4" />,
    unit: 'routes',
    formatValue: (value) => value.toString(),
    description: 'Trip plans and saved journeys'
  },
  {
    type: 'doc_views',
    title: 'Document Views',
    icon: <FileText className="h-4 w-4" />,
    unit: 'views',
    formatValue: (value) => value.toString(),
    description: 'Receipts, manuals, guides'
  }
];

interface TrialLimitsProps {
  onUpgrade?: () => void;
  className?: string;
  variant?: 'compact' | 'detailed';
}

export const TrialLimits: React.FC<TrialLimitsProps> = ({
  onUpgrade,
  className,
  variant = 'detailed'
}) => {
  const { trialInfo, logEvent } = useTrial();
  const [limits, setLimits] = useState<TrialLimit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLimits = async () => {
      if (!trialInfo?.isActive) return;

      try {
        setIsLoading(true);
        const limitPromises = limitConfigs.map(config => 
          trialService.checkLimit(config.type)
        );
        
        const limitResults = await Promise.all(limitPromises);
        const validLimits = limitResults.filter(Boolean) as TrialLimit[];
        setLimits(validLimits);
      } catch (error) {
        console.error('Error fetching limits:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLimits();
  }, [trialInfo]);

  if (!trialInfo?.isActive || isLoading) return null;

  const handleUpgradeClick = async () => {
    await logEvent('cta_click', { 
      source: 'limits_card',
      day: trialInfo.dayNumber 
    });
    
    if (onUpgrade) {
      onUpgrade();
    } else {
      window.location.href = '/upgrade';
    }
  };

  const getUsageLevel = (current: number, max: number) => {
    const percent = (current / max) * 100;
    if (percent >= 90) return 'critical';
    if (percent >= 75) return 'warning';
    if (percent >= 50) return 'moderate';
    return 'low';
  };

  const getProgressColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-600';
      case 'warning': return 'bg-amber-500';
      case 'moderate': return 'bg-blue-500';
      default: return 'bg-green-500';
    }
  };

  const criticalLimits = limits.filter(limit => {
    const percent = (limit.current_usage / limit.max_allowed) * 100;
    return percent >= 90;
  });

  const warningLimits = limits.filter(limit => {
    const percent = (limit.current_usage / limit.max_allowed) * 100;
    return percent >= 75 && percent < 90;
  });

  if (variant === 'compact') {
    if (criticalLimits.length === 0 && warningLimits.length === 0) return null;

    return (
      <Card className={cn("border-amber-200 bg-amber-50", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">
                {criticalLimits.length > 0 
                  ? `${criticalLimits.length} limit(s) nearly reached`
                  : `${warningLimits.length} limit(s) approaching`
                }
              </span>
            </div>
            <Button size="sm" onClick={handleUpgradeClick}>
              Upgrade
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-blue-200", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span>Usage Limits</span>
          </div>
          <Badge variant="outline">
            Trial: Day {trialInfo.dayNumber}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {limitConfigs.map(config => {
          const limit = limits.find(l => l.limit_type === config.type);
          if (!limit) return null;

          const usagePercent = (limit.current_usage / limit.max_allowed) * 100;
          const usageLevel = getUsageLevel(limit.current_usage, limit.max_allowed);
          const progressColor = getProgressColor(usageLevel);

          return (
            <div key={config.type} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {config.icon}
                  <span className="font-medium text-sm">{config.title}</span>
                  {usageLevel === 'critical' && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {config.formatValue(limit.current_usage)} / {config.formatValue(limit.max_allowed)}
                </div>
              </div>
              
              <Progress 
                value={usagePercent} 
                className={cn(
                  "h-2",
                  usageLevel === 'critical' && "bg-red-100",
                  usageLevel === 'warning' && "bg-amber-100"
                )}
              />
              
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-600">{config.description}</p>
                {usagePercent >= 75 && (
                  <Badge 
                    variant="outline"
                    className={cn(
                      "text-xs",
                      usageLevel === 'critical' && "border-red-300 text-red-700",
                      usageLevel === 'warning' && "border-amber-300 text-amber-700"
                    )}
                  >
                    {usagePercent.toFixed(0)}% used
                  </Badge>
                )}
              </div>
            </div>
          );
        })}

        {(criticalLimits.length > 0 || warningLimits.length > 0) && (
          <div className="pt-4 border-t">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-blue-900 mb-1">
                    Upgrade for Unlimited Access
                  </h4>
                  <p className="text-xs text-blue-800 mb-3">
                    Remove all limits and unlock advanced features
                  </p>
                  <Button
                    size="sm"
                    onClick={handleUpgradeClick}
                    className="bg-blue-600 hover:bg-blue-700 text-xs"
                  >
                    View Plans
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};