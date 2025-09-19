import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, RefreshCw, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

interface PAMErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

function PAMErrorFallback({ error, resetError }: PAMErrorFallbackProps) {
  const errorMessage = error.message.toLowerCase();
  const isNetworkError = errorMessage.includes('network') ||
                        errorMessage.includes('fetch') ||
                        errorMessage.includes('websocket');
  const isDNSError = errorMessage.includes('name_not_resolved') ||
                    errorMessage.includes('dns') ||
                    errorMessage.includes('failed to fetch');
  const isAuthError = errorMessage.includes('auth') ||
                     errorMessage.includes('token') ||
                     errorMessage.includes('unauthorized');

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <Bot className="h-6 w-6 text-red-600" />
        </div>
        <CardTitle className="text-xl text-red-600">PAM Assistant Error</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-gray-600">
          {isDNSError
            ? "PAM is having trouble connecting due to DNS resolution issues. This is often a temporary network problem."
            : isAuthError
            ? "PAM authentication is failing. This might be due to expired tokens or service configuration."
            : isNetworkError
            ? "PAM is having trouble connecting to the backend service."
            : "PAM AI assistant is currently experiencing issues."}
        </p>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            {isNetworkError ? (
              <WifiOff className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <h4 className="text-sm font-medium text-red-800">
                {isDNSError ? 'DNS Resolution Issues:' : isNetworkError ? 'Connection Issues:' : isAuthError ? 'Authentication Issues:' : 'Possible causes:'}
              </h4>
              <ul className="text-sm text-red-700 mt-1 space-y-1">
                {isDNSError ? (
                  <>
                    <li>• DNS cannot resolve Supabase hostname</li>
                    <li>• Network DNS configuration issues</li>
                    <li>• Temporary DNS server problems</li>
                    <li>• Local network firewall blocking DNS</li>
                  </>
                ) : isAuthError ? (
                  <>
                    <li>• Supabase authentication token expired</li>
                    <li>• Invalid Supabase credentials</li>
                    <li>• Authentication service unavailable</li>
                    <li>• Session timeout or corruption</li>
                  </>
                ) : isNetworkError ? (
                  <>
                    <li>• WebSocket connection failed</li>
                    <li>• PAM backend service unavailable</li>
                    <li>• Network connectivity issues</li>
                  </>
                ) : (
                  <>
                    <li>• AI service authentication failure</li>
                    <li>• PAM backend service error</li>
                    <li>• Voice recognition or synthesis issues</li>
                    <li>• Browser permissions not granted</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Wifi className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">Recovery steps:</h4>
              <ul className="text-sm text-blue-700 mt-1 space-y-1">
                {isDNSError ? (
                  <>
                    <li>• Use the Mock Development Mode for local testing</li>
                    <li>• Check your DNS settings or try different DNS servers</li>
                    <li>• Wait a few minutes and try again</li>
                    <li>• Contact your network administrator if this persists</li>
                  </>
                ) : isAuthError ? (
                  <>
                    <li>• Try logging out and logging back in</li>
                    <li>• Clear browser cache and cookies</li>
                    <li>• Check if environment variables are properly set</li>
                    <li>• Verify Supabase service is running</li>
                  </>
                ) : (
                  <>
                    <li>• Check your internet connection</li>
                    <li>• Allow microphone permissions for voice features</li>
                    <li>• Try refreshing the page</li>
                    <li>• PAM may automatically reconnect in a few moments</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 p-3 bg-gray-100 rounded-md text-sm">
            <summary className="cursor-pointer font-medium text-gray-700 mb-2">
              PAM Technical Details (Development)
            </summary>
            <div className="space-y-2">
              <p className="font-medium text-red-600">{error.name}</p>
              <p className="text-gray-700">{error.message}</p>
              <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                <p><strong>WebSocket Support:</strong> {'WebSocket' in window ? 'Available' : 'Not Available'}</p>
                <p><strong>Media Devices:</strong> {'mediaDevices' in navigator ? 'Available' : 'Not Available'}</p>
                <p><strong>Speech Recognition:</strong> {'SpeechRecognition' in window || 'webkitSpeechRecognition' in window ? 'Available' : 'Not Available'}</p>
              </div>
              <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-24">
                {error.stack}
              </pre>
            </div>
          </details>
        )}

        <div className="flex gap-2 justify-center flex-wrap">
          <Button onClick={resetError} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Restart PAM
          </Button>
          {isDNSError && (
            <Button
              variant="default"
              onClick={() => window.location.href = '/pam-dev-test'}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Bot className="h-4 w-4" />
              Use Mock Mode
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2"
          >
            Refresh Page
          </Button>
        </div>

        <div className="text-xs text-center text-gray-500">
          PAM will continue to work in simplified mode while we resolve this issue.
        </div>
      </CardContent>
    </Card>
  );
}

interface PAMErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface PAMErrorBoundaryProps {
  children: React.ReactNode;
}

class PAMErrorBoundaryClass extends React.Component<PAMErrorBoundaryProps, PAMErrorBoundaryState> {
  constructor(props: PAMErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): PAMErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PAM AI Assistant error:', error, errorInfo);
    
    // Log PAM-specific diagnostic information
    console.error('PAM Error Context:', {
      userAgent: navigator.userAgent,
      websocketSupport: 'WebSocket' in window,
      mediaDevicesSupport: 'mediaDevices' in navigator,
      speechRecognitionSupport: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
      geolocationSupport: 'geolocation' in navigator,
      timestamp: new Date().toISOString(),
      errorType: error.constructor.name,
      errorMessage: error.message
    });
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <PAMErrorFallback
          error={this.state.error}
          resetError={() => this.setState({ hasError: false, error: undefined })}
        />
      );
    }

    return (
      <div className="pam-error-boundary">
        {this.props.children}
      </div>
    );
  }
}

export function PAMErrorBoundary({ children }: PAMErrorBoundaryProps) {
  return <PAMErrorBoundaryClass>{children}</PAMErrorBoundaryClass>;
}

// Higher-order component to wrap individual PAM components
export function withPAMErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  return function WrappedPAMComponent(props: P) {
    return (
      <PAMErrorBoundary>
        <Component {...props} />
      </PAMErrorBoundary>
    );
  };
}

export default PAMErrorBoundary;