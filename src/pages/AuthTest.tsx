import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthTest() {
  const { user, session } = useAuth();
  const [testResults, setTestResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const results: any = {};

    // Test 1: Check auth session
    results.authSession = {
      hasUser: !!user,
      userId: user?.id,
      email: user?.email,
      hasSession: !!session,
      sessionUserId: session?.user?.id,
    };

    // Test 2: Check if session and user IDs match
    results.idsMatch = user?.id === session?.user?.id;

    // Test 3: Test user_settings access
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .maybeSingle();
      
      results.userSettings = {
        success: !error,
        hasData: !!data,
        error: error?.message,
        errorCode: error?.code,
      };
    } catch (e: any) {
      results.userSettings = {
        success: false,
        error: e.message,
      };
    }

    // Test 4: Test user_subscriptions access
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .maybeSingle();
      
      results.userSubscriptions = {
        success: !error,
        hasData: !!data,
        error: error?.message,
        errorCode: error?.code,
      };
    } catch (e: any) {
      results.userSubscriptions = {
        success: false,
        error: e.message,
      };
    }

    // Test 5: Test user_profiles_extended access
    try {
      const { data, error } = await supabase
        .from('user_profiles_extended')
        .select('*')
        .maybeSingle();
      
      results.userProfilesExtended = {
        success: !error,
        hasData: !!data,
        error: error?.message,
        errorCode: error?.code,
      };
    } catch (e: any) {
      results.userProfilesExtended = {
        success: false,
        error: e.message,
      };
    }

    // Test 6: Test profiles table (should work)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .maybeSingle();
      
      results.profiles = {
        success: !error,
        hasData: !!data,
        profileUserId: data?.id,
        error: error?.message,
        errorCode: error?.code,
      };
    } catch (e: any) {
      results.profiles = {
        success: false,
        error: e.message,
      };
    }

    // Test 7: Get current session from Supabase
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      results.currentSession = {
        hasSession: !!currentSession,
        userId: currentSession?.user?.id,
        email: currentSession?.user?.email,
        error: error?.message,
      };
    } catch (e: any) {
      results.currentSession = {
        error: e.message,
      };
    }

    // Test 8: Check auth token
    results.authToken = {
      hasToken: !!session?.access_token,
      tokenLength: session?.access_token?.length,
      expiresAt: session?.expires_at,
    };

    setTestResults(results);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      runTests();
    }
  }, [user]);

  const getStatusEmoji = (success: boolean) => success ? '✅' : '❌';

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Authentication & RLS Test Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Current Auth State:</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
              {JSON.stringify({ user, hasSession: !!session }, null, 2)}
            </pre>
          </div>

          <Button onClick={runTests} disabled={loading}>
            {loading ? 'Running Tests...' : 'Run Tests'}
          </Button>

          {Object.keys(testResults).length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Test Results:</h3>
              
              <div className="space-y-2">
                <div className="p-2 bg-gray-50 rounded">
                  <h4 className="font-medium">1. Auth Session</h4>
                  <pre className="text-xs mt-1">
                    {JSON.stringify(testResults.authSession, null, 2)}
                  </pre>
                </div>

                <div className="p-2 bg-gray-50 rounded">
                  <h4 className="font-medium">
                    2. ID Match {getStatusEmoji(testResults.idsMatch)}
                  </h4>
                  <p className="text-xs">User ID matches Session ID: {testResults.idsMatch ? 'Yes' : 'No'}</p>
                </div>

                <div className="p-2 bg-gray-50 rounded">
                  <h4 className="font-medium">
                    3. user_settings {getStatusEmoji(testResults.userSettings?.success)}
                  </h4>
                  <pre className="text-xs mt-1">
                    {JSON.stringify(testResults.userSettings, null, 2)}
                  </pre>
                </div>

                <div className="p-2 bg-gray-50 rounded">
                  <h4 className="font-medium">
                    4. user_subscriptions {getStatusEmoji(testResults.userSubscriptions?.success)}
                  </h4>
                  <pre className="text-xs mt-1">
                    {JSON.stringify(testResults.userSubscriptions, null, 2)}
                  </pre>
                </div>

                <div className="p-2 bg-gray-50 rounded">
                  <h4 className="font-medium">
                    5. user_profiles_extended {getStatusEmoji(testResults.userProfilesExtended?.success)}
                  </h4>
                  <pre className="text-xs mt-1">
                    {JSON.stringify(testResults.userProfilesExtended, null, 2)}
                  </pre>
                </div>

                <div className="p-2 bg-gray-50 rounded">
                  <h4 className="font-medium">
                    6. profiles (control) {getStatusEmoji(testResults.profiles?.success)}
                  </h4>
                  <pre className="text-xs mt-1">
                    {JSON.stringify(testResults.profiles, null, 2)}
                  </pre>
                </div>

                <div className="p-2 bg-gray-50 rounded">
                  <h4 className="font-medium">7. Current Session</h4>
                  <pre className="text-xs mt-1">
                    {JSON.stringify(testResults.currentSession, null, 2)}
                  </pre>
                </div>

                <div className="p-2 bg-gray-50 rounded">
                  <h4 className="font-medium">8. Auth Token</h4>
                  <pre className="text-xs mt-1">
                    {JSON.stringify(testResults.authToken, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 rounded">
                <h4 className="font-medium mb-2">Instructions to Fix RLS Issues:</h4>
                <ol className="list-decimal list-inside text-sm space-y-1">
                  <li>Go to your Supabase Dashboard → SQL Editor</li>
                  <li>Open the file <code>fix-rls-working.sql</code> from this project</li>
                  <li>Copy and paste the SQL into the editor</li>
                  <li>Click "Run" to execute the SQL</li>
                  <li>Refresh this page and run tests again</li>
                </ol>
                <p className="text-xs mt-2 text-gray-600">
                  RLS issues have been fixed! All tests should now pass.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}