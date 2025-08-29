/**
 * PAM AI SDK Test Page
 * Accessible route for testing AI SDK integration in staging
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PamPOCTestPage } from '../experiments/ai-sdk-poc/PamPOCTestPage';
import { flags } from '@/config/featureFlags';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertTriangle, Shield } from 'lucide-react';

const PamAiSdkTest: React.FC = () => {
  const navigate = useNavigate();

  // Security check - only allow in non-production environments
  const isProduction = import.meta.env.VITE_ENVIRONMENT === 'production';
  
  if (isProduction && !flags.aiSdkPocMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-500" />
              Access Restricted
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              PAM AI SDK testing is not available in production environment.
            </p>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Warning Banner for Production */}
      {isProduction && (
        <div className="bg-orange-500 text-white px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">Production Environment:</span>
            <span>This is a live testing interface. Use with caution.</span>
          </div>
        </div>
      )}
      
      {/* Development/Staging Info */}
      {!isProduction && (
        <div className="bg-blue-500 text-white px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="secondary">
                {import.meta.env.VITE_ENVIRONMENT || 'development'}
              </Badge>
              <span>PAM AI SDK Testing Environment</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-white hover:bg-blue-600"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to App
            </Button>
          </div>
        </div>
      )}

      {/* Main POC Interface */}
      <PamPOCTestPage onBack={() => navigate('/')} />
    </div>
  );
};

export default PamAiSdkTest;