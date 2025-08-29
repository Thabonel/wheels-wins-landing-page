/**
 * Voice Status Indicator Component
 * Shows the current status of voice recording/playback
 */

import React from 'react';
import { Mic, Volume2, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type VoiceStatus = 
  | 'idle'
  | 'recording'
  | 'processing'
  | 'playing'
  | 'transcribing'
  | 'success'
  | 'error';

interface VoiceStatusIndicatorProps {
  status: VoiceStatus;
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
}

export const VoiceStatusIndicator: React.FC<VoiceStatusIndicatorProps> = ({
  status,
  message,
  className,
  size = 'md',
  showLabel = true,
  animated = true,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'idle':
        return {
          icon: <Mic className="text-gray-400" />,
          label: 'Ready',
          color: 'bg-gray-100',
          textColor: 'text-gray-600',
          animation: '',
        };
      case 'recording':
        return {
          icon: <Mic className="text-red-500" />,
          label: 'Recording',
          color: 'bg-red-100',
          textColor: 'text-red-600',
          animation: animated ? 'animate-pulse' : '',
        };
      case 'processing':
        return {
          icon: <Loader2 className="text-blue-500" />,
          label: 'Processing',
          color: 'bg-blue-100',
          textColor: 'text-blue-600',
          animation: animated ? 'animate-spin' : '',
        };
      case 'playing':
        return {
          icon: <Volume2 className="text-green-500" />,
          label: 'Playing',
          color: 'bg-green-100',
          textColor: 'text-green-600',
          animation: animated ? 'animate-pulse' : '',
        };
      case 'transcribing':
        return {
          icon: <Loader2 className="text-purple-500" />,
          label: 'Transcribing',
          color: 'bg-purple-100',
          textColor: 'text-purple-600',
          animation: animated ? 'animate-spin' : '',
        };
      case 'success':
        return {
          icon: <CheckCircle className="text-green-500" />,
          label: 'Success',
          color: 'bg-green-100',
          textColor: 'text-green-600',
          animation: '',
        };
      case 'error':
        return {
          icon: <AlertCircle className="text-red-500" />,
          label: 'Error',
          color: 'bg-red-100',
          textColor: 'text-red-600',
          animation: '',
        };
    }
  };

  const sizeClasses = {
    sm: {
      container: 'px-2 py-1',
      icon: 'h-3 w-3',
      text: 'text-xs',
    },
    md: {
      container: 'px-3 py-1.5',
      icon: 'h-4 w-4',
      text: 'text-sm',
    },
    lg: {
      container: 'px-4 py-2',
      icon: 'h-5 w-5',
      text: 'text-base',
    },
  };

  const config = getStatusConfig();
  const sizeConfig = sizeClasses[size];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full',
        config.color,
        sizeConfig.container,
        className
      )}
    >
      <div className={cn(sizeConfig.icon, config.animation)}>
        {React.cloneElement(config.icon, { 
          className: cn(sizeConfig.icon, config.icon.props.className) 
        })}
      </div>
      {showLabel && (
        <span className={cn(sizeConfig.text, config.textColor, 'font-medium')}>
          {message || config.label}
        </span>
      )}
    </div>
  );
};

interface VoiceStatusListProps {
  items: Array<{
    id: string;
    status: VoiceStatus;
    message?: string;
  }>;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const VoiceStatusList: React.FC<VoiceStatusListProps> = ({
  items,
  className,
  size = 'sm',
}) => {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {items.map((item) => (
        <VoiceStatusIndicator
          key={item.id}
          status={item.status}
          message={item.message}
          size={size}
        />
      ))}
    </div>
  );
};