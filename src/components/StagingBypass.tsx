import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { isStaging, enableStagingBypass } from '@/config/staging';

export default function StagingBypass() {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-enable bypass if we're on this page in staging
    if (isStaging()) {
      enableStagingBypass();
    }
  }, []);

  const handleBypass = () => {
    enableStagingBypass();
    // Force reload to apply bypass
    window.location.href = '/you';
  };

  if (!isStaging()) {
    return (
      <div className="container max-w-md mx-auto px-4 py-16">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              This feature is only available in staging environment.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
          </div>
          <CardTitle>Staging Environment</CardTitle>
          <CardDescription>
            Authentication bypass for testing purposes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-yellow-50 p-4 text-sm">
            <p className="font-medium text-yellow-900 mb-2">⚠️ Testing Mode</p>
            <p className="text-yellow-800">
              This will bypass authentication and log you in as a test user. 
              This is only available in the staging environment for testing purposes.
            </p>
          </div>
          
          <Button 
            onClick={handleBypass}
            className="w-full"
            size="lg"
          >
            Enter Staging Mode
          </Button>
          
          <div className="text-center text-sm text-muted-foreground">
            <p>You will be logged in as:</p>
            <p className="font-mono mt-1">staging@wheelsandwins.com</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}