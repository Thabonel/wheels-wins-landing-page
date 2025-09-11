import React from 'react';
import PamWebSocketTester from '@/components/pam/PamWebSocketTester';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PamWebSocketTest() {
  const isDevelopment = import.meta.env.DEV;
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">PAM WebSocket Connection Test</h1>
        <p className="text-muted-foreground">
          Diagnostic tool for testing PAM AI Assistant WebSocket connectivity
        </p>
      </div>

      {!isDevelopment && (
        <Alert className="mb-6 border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            This diagnostic tool is typically used in development mode. 
            Be cautious when running tests in production.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Connection Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Protocol:</span>
                <span className="font-mono">WSS (Secure WebSocket)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Authentication:</span>
                <span className="font-mono">JWT Bearer Token</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Backend:</span>
                <span className="font-mono">
                  {import.meta.env.VITE_BACKEND_URL || 'Default'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <PamWebSocketTester />
      
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Test Information</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Authentication: Verifies Supabase session and JWT token</li>
          <li>• Backend URL: Checks configuration and accessibility</li>
          <li>• Health Check: Tests HTTP endpoint before WebSocket</li>
          <li>• WebSocket URL: Validates URL construction with user ID</li>
          <li>• Connection: Attempts WebSocket handshake and connection</li>
          <li>• Messaging: Tests bidirectional message flow</li>
          <li>• CORS: Verifies cross-origin resource sharing settings</li>
        </ul>
      </div>
    </div>
  );
}