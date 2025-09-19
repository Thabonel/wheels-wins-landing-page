import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { testRealJWTTransmission, attemptJWTFix } from '@/utils/authJWTTest';
import { runQuickDiagnosis } from '@/utils/authQuickTest';
import { getAuthDebugInfo } from '@/utils/authDebug';
import { investigateAuthIssue, generateAuthDiagnosis } from '@/utils/authInvestigation';
import { CheckCircle, XCircle, AlertCircle, Loader2, Bug, Shield, Database } from 'lucide-react';

const AuthDebugAdmin: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [lastTestType, setLastTestType] = useState<string>('');

  const handleJWTRealTest = async () => {
    setIsLoading(true);
    setLastTestType('JWT Real Test');
    try {
      console.log('🧪 Running JWT Real Test...');
      const result = await testRealJWTTransmission();
      console.log('JWT Test Result:', result);

      setTestResults({
        success: result.success,
        type: 'jwt',
        data: result,
        timestamp: new Date().toISOString()
      });

      if (!result.success) {
        // Try auto-fix
        console.log('🔧 Attempting auto-fix...');
        const fixResult = await attemptJWTFix();
        console.log('Auto-fix result:', fixResult);

        if (fixResult.success) {
          // Re-run test after fix
          const retestResult = await testRealJWTTransmission();
          setTestResults({
            success: retestResult.success,
            type: 'jwt',
            data: retestResult,
            fixApplied: fixResult.action,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('JWT test failed:', error);
      setTestResults({
        success: false,
        type: 'jwt',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    setIsLoading(false);
  };

  const handleQuickDiagnosis = async () => {
    setIsLoading(true);
    setLastTestType('Quick Diagnosis');
    try {
      console.log('🔍 Running Quick Diagnosis...');
      await runQuickDiagnosis();

      const authInfo = await getAuthDebugInfo();
      setTestResults({
        success: authInfo.isAuthenticated,
        type: 'diagnosis',
        data: authInfo,
        message: 'Check browser console for detailed diagnosis',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Quick diagnosis failed:', error);
      setTestResults({
        success: false,
        type: 'diagnosis',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    setIsLoading(false);
  };

  const handleFullInvestigation = async () => {
    setIsLoading(true);
    setLastTestType('Full Investigation');
    try {
      console.log('🕵️ Running Full Investigation...');
      const report = await investigateAuthIssue();
      const diagnosis = generateAuthDiagnosis(report);

      console.log('Investigation Report:', report);
      console.log('Diagnosis:', diagnosis);

      setTestResults({
        success: diagnosis.filter(d => d.startsWith('❌')).length === 0,
        type: 'investigation',
        data: report,
        diagnosis: diagnosis,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Investigation failed:', error);
      setTestResults({
        success: false,
        type: 'investigation',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    setIsLoading(false);
  };

  const renderTestResults = () => {
    if (!testResults) return null;

    const { success, type, data, error, diagnosis, fixApplied, timestamp } = testResults;

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {success ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            {lastTestType} Results
            <Badge variant={success ? 'default' : 'destructive'}>
              {success ? 'PASS' : 'FAIL'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {fixApplied && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Auto-fix applied: {fixApplied}
                </AlertDescription>
              </Alert>
            )}

            {type === 'jwt' && data && (
              <div className="space-y-2">
                <h4 className="font-medium">JWT Test Findings:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>Session: {data.findings.hasSession ? '✅' : '❌'}</div>
                  <div>Token: {data.findings.hasToken ? '✅' : '❌'}</div>
                  <div>Valid: {data.findings.tokenValid ? '✅' : '❌'}</div>
                  <div>DB Receives: {data.findings.databaseReceivesJWT ? '✅' : '❌'}</div>
                  <div>auth.uid(): {data.findings.authUidWorks ? '✅' : '❌'}</div>
                </div>
                {data.recommendations && data.recommendations.length > 0 && (
                  <div className="mt-3">
                    <h5 className="font-medium text-sm mb-1">Recommendations:</h5>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      {data.recommendations.map((rec: string, idx: number) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {diagnosis && (
              <div className="space-y-2">
                <h4 className="font-medium">Diagnosis:</h4>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  {diagnosis.map((item: string, idx: number) => (
                    <div key={idx} className={item.startsWith('❌') ? 'text-red-600' : item.startsWith('💡') ? 'text-blue-600' : 'text-gray-700'}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500">
              Test completed at: {new Date(timestamp).toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bug className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold">Authentication Debug Center</h1>
          <p className="text-gray-600">Comprehensive authentication testing and debugging tools</p>
        </div>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Current Authentication Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">Status:</span>
              <Badge variant={isAuthenticated ? 'default' : 'destructive'}>
                {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">User ID:</span>
              <span className="font-mono text-sm">
                {user?.id ? `${user.id.substring(0, 8)}...` : 'None'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Email:</span>
              <span className="text-sm">{user?.email || 'None'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Authentication Tests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={handleJWTRealTest}
              disabled={isLoading}
              className="h-20 flex flex-col items-center justify-center"
              variant="default"
            >
              {isLoading && lastTestType === 'JWT Real Test' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Bug className="h-5 w-5 mb-1" />
              )}
              <span className="font-medium">JWT Real Test</span>
              <span className="text-xs opacity-75">Test auth.uid() functionality</span>
            </Button>

            <Button
              onClick={handleQuickDiagnosis}
              disabled={isLoading}
              className="h-20 flex flex-col items-center justify-center"
              variant="outline"
            >
              {isLoading && lastTestType === 'Quick Diagnosis' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <AlertCircle className="h-5 w-5 mb-1" />
              )}
              <span className="font-medium">Quick Diagnosis</span>
              <span className="text-xs opacity-75">Basic auth checks</span>
            </Button>

            <Button
              onClick={handleFullInvestigation}
              disabled={isLoading}
              className="h-20 flex flex-col items-center justify-center"
              variant="secondary"
            >
              {isLoading && lastTestType === 'Full Investigation' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Shield className="h-5 w-5 mb-1" />
              )}
              <span className="font-medium">Full Investigation</span>
              <span className="text-xs opacity-75">Comprehensive analysis</span>
            </Button>
          </div>

          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Instructions:</strong> Make sure you're signed in first, then click "JWT Real Test" to test if auth.uid() works in the application.
              Check the browser console for detailed diagnostic information.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* SQL Scripts Information */}
      <Card>
        <CardHeader>
          <CardTitle>Database SQL Scripts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-3">
            If issues are found, you can run these SQL scripts in your Supabase SQL Editor:
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Emergency</Badge>
              <code className="text-xs">launch-preparation/sql-scripts/20250916_emergency_auth_fix.sql</code>
              <span className="text-gray-600">- Apply temporary permissive policies</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Diagnostic</Badge>
              <code className="text-xs">launch-preparation/sql-scripts/20250916_targeted_auth_uid_fix.sql</code>
              <span className="text-gray-600">- Diagnose auth.uid() issues</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Restore</Badge>
              <code className="text-xs">launch-preparation/sql-scripts/20250916_restore_proper_rls_policies.sql</code>
              <span className="text-gray-600">- Restore proper RLS policies when fixed</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">User Settings</Badge>
              <code className="text-xs">launch-preparation/sql-scripts/20250117_diagnose_user_settings.sql</code>
              <span className="text-gray-600">- Diagnose user_settings RLS issues</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Fix Settings</Badge>
              <code className="text-xs">launch-preparation/sql-scripts/20250117_fix_user_settings_rls.sql</code>
              <span className="text-gray-600">- Fix user_settings table RLS policies</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">CORRECTED Fix</Badge>
              <code className="text-xs">launch-preparation/sql-scripts/20250117_fix_user_settings_rls_corrected.sql</code>
              <span className="text-gray-600">- Clean fix for conflicting RLS policies</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {renderTestResults()}
    </div>
  );
};

export default AuthDebugAdmin;