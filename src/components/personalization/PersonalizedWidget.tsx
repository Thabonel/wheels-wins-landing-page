import React, { ReactNode, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Minimize2, Maximize2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePersonalization } from '@/hooks/usePersonalization';

interface PersonalizedWidgetProps {
  widgetId: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  children: ReactNode;
  className?: string;
  allowResize?: boolean;
  allowHide?: boolean;
  allowCustomize?: boolean;
  defaultSize?: 'small' | 'medium' | 'large';
  category?: string;
  onHide?: () => void;
  onResize?: (size: 'small' | 'medium' | 'large') => void;
  onCustomize?: () => void;
}

export function PersonalizedWidget({
  widgetId,
  title,
  description,
  priority = 'medium',
  children,
  className,
  allowResize = true,
  allowHide = true,
  allowCustomize = false,
  defaultSize = 'medium',
  category,
  onHide,
  onResize,
  onCustomize
}: PersonalizedWidgetProps) {
  const {
    getWidgetSize,
    isWidgetHidden,
    getPersonalizedStyles,
    getAnimationClass,
    getFontSizeClass,
    getContrastClass,
    trackEvent,
    isPersonalized
  } = usePersonalization();

  // Get personalized size or fall back to default
  const personalizedSize = isPersonalized ? getWidgetSize(widgetId) : defaultSize;
  const isHidden = isWidgetHidden(widgetId);

  // Track widget view
  useEffect(() => {
    if (!isHidden) {
      trackEvent('widget_viewed', {
        widget_id: widgetId,
        size: personalizedSize,
        priority,
        category
      });
    }
  }, [widgetId, personalizedSize, priority, category, isHidden, trackEvent]);

  // Don't render if hidden
  if (isHidden) {
    return null;
  }

  // Get size-based classes
  const getSizeClasses = () => {
    switch (personalizedSize) {
      case 'small':
        return 'col-span-1 h-32';
      case 'large':
        return 'col-span-2 h-80';
      default: // medium
        return 'col-span-1 h-48';
    }
  };

  const getPriorityColor = () => {
    switch (priority) {
      case 'critical':
        return 'border-red-500 bg-red-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'medium':
        return 'border-blue-500 bg-blue-50';
      case 'low':
        return 'border-gray-500 bg-gray-50';
      default:
        return '';
    }
  };

  const handleHide = () => {
    trackEvent('widget_hidden', {
      widget_id: widgetId,
      size: personalizedSize,
      user_initiated: true
    });
    onHide?.();
  };

  const handleResize = (newSize: 'small' | 'medium' | 'large') => {
    trackEvent('widget_resized', {
      widget_id: widgetId,
      old_size: personalizedSize,
      new_size: newSize
    });
    onResize?.(newSize);
  };

  const handleCustomize = () => {
    trackEvent('widget_customized', {
      widget_id: widgetId,
      size: personalizedSize
    });
    onCustomize?.();
  };

  return (
    <Card
      className={cn(
        'relative transition-all duration-200 hover:shadow-md',
        getSizeClasses(),
        isPersonalized ? getPriorityColor() : '',
        getAnimationClass(),
        getFontSizeClass(),
        getContrastClass(),
        className
      )}
      style={getPersonalizedStyles('widget')}
    >
      {/* Widget Header */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {priority !== 'medium' && (
              <Badge
                variant={priority === 'critical' || priority === 'high' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {priority}
              </Badge>
            )}
          </div>

          {/* Widget Controls */}
          <div className="flex items-center gap-1">
            {allowResize && (
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleResize('small')}
                  title="Small size"
                >
                  <Minimize2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleResize('large')}
                  title="Large size"
                >
                  <Maximize2 className="w-3 h-3" />
                </Button>
              </div>
            )}

            {allowCustomize && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleCustomize}
                title="Customize widget"
              >
                <Settings className="w-3 h-3" />
              </Button>
            )}

            {allowHide && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleHide}
                title="Hide widget"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardHeader>

      {/* Widget Content */}
      <CardContent className="pt-0 h-full overflow-hidden">
        <div className="h-full flex flex-col">
          {children}
        </div>
      </CardContent>

      {/* Personalization Indicator */}
      {isPersonalized && (
        <div className="absolute top-1 right-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" title="Personalized" />
        </div>
      )}
    </Card>
  );
}

// Wrapper for quick widget creation with common patterns
export function QuickWidget({
  id,
  title,
  children,
  ...props
}: {
  id: string;
  title: string;
  children: ReactNode;
} & Partial<PersonalizedWidgetProps>) {
  return (
    <PersonalizedWidget
      widgetId={id}
      title={title}
      {...props}
    >
      {children}
    </PersonalizedWidget>
  );
}

export default PersonalizedWidget;