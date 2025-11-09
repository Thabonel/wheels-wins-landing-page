/**
 * Authentication Debug Panel
 * Only shown in development mode to help diagnose auth issues
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  getAuthDebugInfo,
  testDatabaseAccess,
  refreshAndTest,
  quickAuthDiagnosis,
  enableAuthDebugLogging,
  recoverAuthentication,
  testJWTTransmission,
  type AuthDebugInfo
} from '@/utils/authDebug';
import { investigateAuthIssue, generateAuthDiagnosis } from '@/utils/authInvestigation';
import { testRealJWTTransmission, attemptJWTFix } from '@/utils/authJWTTest';

export const AuthDebugPanel: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [debugInfo, setDebugInfo] = useState<AuthDebugInfo | null>(null);
  const [dbTestResult, setDbTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadDebugInfo = async () => {
    setIsLoading(true);
    try {
      const info = await getAuthDebugInfo();
      setDebugInfo(info);
    } catch (error) {
      console.error('Failed to load debug info:', error);
    }
    setIsLoading(false);
  };

  const runDatabaseTest = async () => {
    setIsLoading(true);
    try {
      const result = await testDatabaseAccess();
      setDbTestResult(result);
    } catch (error) {
      console.error('Database test failed:', error);
      setDbTestResult({ success: false, error: error.message });
    }
    setIsLoading(false);
  };

  const runJWTDiagnosis = async () => {
    setIsLoading(true);
    try {
      // First test JWT transmission
      const transmissionResult = await testJWTTransmission();
      console.log('🔍 JWT Transmission Result:', transmissionResult);

      // Then run the SQL diagnosis function
      const { data, error } = await supabase
        .rpc('diagnose_auth_issue');

      if (error) {
        console.error('JWT diagnosis failed:', error);
        setDbTestResult({
          success: false,
          error: `JWT diagnosis failed: ${error.message}`,
          diagnosis: 'Could not run JWT diagnosis function. This may indicate a deeper authentication issue.',
          transmission: transmissionResult
        });
      } else {
        console.log('🩺 JWT Diagnosis Results:', data);
        setDbTestResult({
          success: true,
          data,
          diagnosis: 'JWT diagnosis completed - check console for detailed results',
          transmission: transmissionResult
        });
      }
    } catch (error) {
      console.error('JWT diagnosis error:', error);
      setDbTestResult({
        success: false,
        error: error.message,
        diagnosis: 'Failed to execute JWT diagnosis'
      });
    }
    setIsLoading(false);
  };

  const runRefreshTest = async () => {
    setIsLoading(true);
    try {
      const result = await refreshAndTest();
      setDbTestResult(result);
      await loadDebugInfo();
    } catch (error) {
      console.error('Refresh test failed:', error);
    }
    setIsLoading(false);
  };

  const runQuickDiagnosis = async () => {
    await quickAuthDiagnosis();
  };

  const runAuthRecovery = async () => {
    setIsLoading(true);
    try {
      const result = await recoverAuthentication();
      console.log('🔧 Recovery result:', result);

      if (result.success) {
        setDbTestResult({
          success: true,
          strategy: result.strategy,
          diagnosis: `Authentication recovered using: ${result.strategy}`
        });

        // Refresh debug info after recovery
        await loadDebugInfo();
      } else {
        setDbTestResult({
          success: false,
          error: result.error || 'Recovery failed',
          diagnosis: 'All recovery strategies failed. Manual intervention may be required.'
        });
      }
    } catch (error) {
      console.error('Recovery failed:', error);
      setDbTestResult({
        success: false,
        error: error.message,
        diagnosis: 'Recovery process crashed. Check console for details.'
      });
    }
    setIsLoading(false);
  };

  const runFullInvestigation = async () => {
    setIsLoading(true);
    try {
      const report = await investigateAuthIssue();
      const diagnosis = generateAuthDiagnosis(report);

      console.log('🕵️ Full Investigation Report:', report);
      console.log('📋 Diagnosis:', diagnosis);

      setDbTestResult({
        success: diagnosis.filter(d => d.startsWith('❌')).length === 0,
        investigation: report,
        diagnosis: `Investigation complete. Found ${diagnosis.filter(d => d.startsWith('❌')).length} issues. Check console for detailed report.`
      });
    } catch (error) {
      console.error('Investigation failed:', error);
      setDbTestResult({
        success: false,
        error: error.message,
        diagnosis: 'Investigation failed. Check console for details.'
      });
    }
    setIsLoading(false);
  };

  const runRealJWTTest = async () => {
    setIsLoading(true);
    try {
      const result = await testRealJWTTransmission();
      console.log('🧪 Real JWT Test Result:', result);

      setDbTestResult({
        success: result.success,
        jwtTest: result,
        diagnosis: result.success
          ? 'JWT transmission is working correctly!'
          : `JWT transmission issues found: ${result.recommendations.join(', ')}`,
        error: result.findings.specificError
      });

      if (!result.success) {
        // Try to fix it automatically
        setTimeout(async () => {
          const fixResult = await attemptJWTFix();
          console.log('🔧 JWT Fix Result:', fixResult);

          if (fixResult.success) {
            setDbTestResult(prev => ({
              ...prev,
              diagnosis: `${prev.diagnosis  } ✅ Auto-fix successful: ${fixResult.action}`
            }));
            // Refresh debug info after fix
            await loadDebugInfo();
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Real JWT test failed:', error);
      setDbTestResult({
        success: false,
        error: error.message,
        diagnosis: 'JWT transmission test crashed. Check console for details.'
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadDebugInfo();
    enableAuthDebugLogging();
  }, []);

  // Only show in development mode
  if (import.meta.env.MODE === 'production') {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-96 overflow-y-auto z-50 bg-white dark:bg-gray-800 shadow-lg border-2 border-yellow-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          🔧 Auth Debug Panel
          <Badge variant={isAuthenticated ? 'default' : 'destructive'}>
            {isAuthenticated ? 'AUTH OK' : 'AUTH FAIL'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        {debugInfo && (
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Authenticated:</span>
              <Badge variant={debugInfo.isAuthenticated ? 'default' : 'destructive'}>
                {debugInfo.isAuthenticated ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>User ID:</span>
              <span className="font-mono text-xs">
                {debugInfo.userId ? `${debugInfo.userId.substring(0, 8)}...` : 'null'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Email:</span>
              <span className="text-xs">{debugInfo.userEmail || 'null'}</span>
            </div>
            <div className="flex justify-between">
              <span>Token:</span>
              <Badge variant={debugInfo.hasAccessToken ? 'default' : 'destructive'}>
                {debugInfo.hasAccessToken ? 'Present' : 'Missing'}
              </Badge>
            </div>
          </div>
        )}

        {dbTestResult && (
          <div className="border-t pt-2">
            <div className="flex justify-between">
              <span>DB Access:</span>
              <Badge variant={dbTestResult.success ? 'default' : 'destructive'}>
                {dbTestResult.success ? 'Success' : 'Failed'}
              </Badge>
            </div>
            {dbTestResult.error && (
              <div className="text-red-600 text-xs mt-1">
                {dbTestResult.error}
              </div>
            )}
            {dbTestResult.diagnosis && (
              <div className="text-blue-600 text-xs mt-1">
                💡 {dbTestResult.diagnosis}
              </div>
            )}
            {dbTestResult.strategy && (
              <div className="text-green-600 text-xs mt-1">
                ✅ Strategy: {dbTestResult.strategy}
              </div>
            )}
            {dbTestResult.data && Array.isArray(dbTestResult.data) && (
              <div className="text-xs mt-1 space-y-1">
                {dbTestResult.data.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between">
                    <span className="font-mono">{item.check_name}:</span>
                    <Badge variant={item.status === 'PASS' ? 'default' : item.status === 'FAIL' ? 'destructive' : 'secondary'} className="text-xs">
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-1 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadDebugInfo}
            disabled={isLoading}
            className="text-xs h-6"
          >
            Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={runDatabaseTest}
            disabled={isLoading}
            className="text-xs h-6"
          >
            Test DB
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={runRefreshTest}
            disabled={isLoading}
            className="text-xs h-6"
          >
            Refresh Token
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={runQuickDiagnosis}
            disabled={isLoading}
            className="text-xs h-6"
          >
            Diagnose
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={runJWTDiagnosis}
            disabled={isLoading}
            className="text-xs h-6"
          >
            JWT Test
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={runAuthRecovery}
            disabled={isLoading}
            className="text-xs h-6"
          >
            Recovery
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={runFullInvestigation}
            disabled={isLoading}
            className="text-xs h-6"
          >
            Investigate
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={runRealJWTTest}
            disabled={isLoading}
            className="text-xs h-6"
          >
            JWT Real Test
          </Button>
        </div>

        <div className="text-xs text-gray-500 pt-1">
          💡 Check browser console for detailed logs
        </div>
      </CardContent>
    </Card>
  );
};