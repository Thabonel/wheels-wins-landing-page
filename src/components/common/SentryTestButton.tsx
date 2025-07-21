import { Button } from '@/components/ui/button';
import { captureException, captureMessage } from '@/lib/sentry';

/**
 * Test component for verifying Sentry integration
 * Remove this component in production
 */
export function SentryTestButton() {
  const testError = () => {
    try {
      throw new Error("This is a test error for Sentry!");
    } catch (error) {
      captureException(error);
    }
  };

  const testMessage = () => {
    captureMessage("This is a test message from Wheels and Wins!", "info");
  };

  const testCrash = () => {
    // This will trigger the error boundary
    throw new Error("This is a test crash that will trigger the error boundary!");
  };

  // Only show in development
  if (import.meta.env.MODE === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      <div className="bg-white border border-gray-300 rounded-lg p-2 shadow-lg">
        <div className="text-xs text-gray-600 mb-2">Sentry Test (Dev Only)</div>
        <div className="space-y-1">
          <Button 
            onClick={testMessage} 
            size="sm" 
            variant="outline"
            className="w-full text-xs"
          >
            Test Message
          </Button>
          <Button 
            onClick={testError} 
            size="sm" 
            variant="outline"
            className="w-full text-xs"
          >
            Test Error
          </Button>
          <Button 
            onClick={testCrash} 
            size="sm" 
            variant="destructive"
            className="w-full text-xs"
          >
            Test Crash
          </Button>
        </div>
      </div>
    </div>
  );
}