import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, AlertTriangle, Database } from 'lucide-react';

interface SocialNetworkingErrorFallbackProps {
  onRetry?: () => void;
}

export function SocialNetworkingErrorFallback({ onRetry }: SocialNetworkingErrorFallbackProps) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
          <Database className="h-6 w-6 text-yellow-600" />
        </div>
        <CardTitle className="text-xl text-yellow-600">Social Features Unavailable</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-gray-600">
          Social networking features are currently being set up. Some database tables are missing.
        </p>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Missing Features:</h4>
              <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                <li>• Friend requests and connections</li>
                <li>• User following/followers</li>
                <li>• Social interactions tracking</li>
                <li>• User trust scores</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Users className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">Available Now:</h4>
              <ul className="text-sm text-blue-700 mt-1 space-y-1">
                <li>• Social posts and feeds</li>
                <li>• Group memberships</li>
                <li>• Marketplace listings</li>
                <li>• Comments and discussions</li>
              </ul>
            </div>
          </div>
        </div>

        {onRetry && (
          <div className="flex justify-center">
            <Button onClick={onRetry} variant="outline">
              Check Again
            </Button>
          </div>
        )}

        <div className="text-xs text-center text-gray-500">
          We're working to enable all social features soon!
        </div>
      </CardContent>
    </Card>
  );
}