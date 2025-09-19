import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface AuthError {
  type: 'invalid_credentials' | 'network_error' | 'session_expired' | 'email_not_confirmed' | 'rate_limited' | 'unknown';
  message: string;
  canRetry: boolean;
  suggestedAction?: string;
}

interface AuthErrorDisplayProps {
  error: AuthError;
  onRetry?: () => void;
  onDismiss: () => void;
  className?: string;
}

export function AuthErrorDisplay({ error, onRetry, onDismiss, className }: AuthErrorDisplayProps) {
  const getErrorVariant = () => {
    switch (error.type) {
      case 'invalid_credentials':
      case 'email_not_confirmed':
        return 'destructive';
      case 'rate_limited':
      case 'session_expired':
        return 'default';
      case 'network_error':
        return 'default';
      default:
        return 'destructive';
    }
  };

  const getErrorIcon = () => {
    switch (error.type) {
      case 'network_error':
        return <RefreshCw className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <Alert variant={getErrorVariant()} className={className}>
      <div className="flex items-start gap-2">
        {getErrorIcon()}
        <div className="flex-1">
          <AlertDescription className="mb-2">
            {error.message}
          </AlertDescription>

          {error.suggestedAction && (
            <div className="text-sm text-muted-foreground mb-3">
              <strong>Suggestion:</strong> {error.suggestedAction}
            </div>
          )}

          <div className="flex items-center gap-2">
            {error.canRetry && onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="h-8"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="h-8"
            >
              <X className="h-3 w-3 mr-1" />
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </Alert>
  );
}

export default AuthErrorDisplay;