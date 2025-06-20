
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, Loader2, RefreshCw, Info, CheckCircle } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAuth } from '@/context/AuthContext';

interface AdminProtectionProps {
  children: React.ReactNode;
}

const AdminProtection: React.FC<AdminProtectionProps> = ({ children }) => {
  const { user } = useAuth();
  const { isAdmin, loading, error, recheckAdminStatus } = useAdminAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please log in to access this area.</p>
            <Button onClick={() => window.location.href = '/login'}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Verifying Access</h2>
            <p className="text-gray-600">Checking your admin privileges...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md border-red-200">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 mb-2">Access Check Failed</h2>
            <p className="text-red-600 mb-4">{error}</p>
            
            {/* Show success message for expected admin user */}
            {user.email === 'thabonel0@gmail.com' && (
              <div className="bg-green-50 p-3 rounded-md mb-4 text-left">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium mb-1">Admin Setup Complete!</p>
                    <p className="text-xs">Your admin access has been configured. Try refreshing the page.</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-blue-50 p-3 rounded-md mb-4 text-left">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Admin Access Recovery:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Admin user has been bootstrapped in the database</li>
                    <li>Try clicking "Retry Access Check" below</li>
                    <li>If issues persist, refresh the page</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Button 
                variant="outline" 
                onClick={recheckAdminStatus}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Access Check
              </Button>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-xs text-gray-600">
                  <strong>Debug Info:</strong><br />
                  User ID: {user.id}<br />
                  Email: {user.email}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md border-red-200">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
            <p className="text-red-600 mb-4">You need admin privileges to access this area.</p>
            <div className="bg-gray-50 p-3 rounded-md mb-4">
              <p className="text-sm text-gray-600">
                <strong>User ID:</strong> {user.id}<br />
                <strong>Email:</strong> {user.email}
              </p>
            </div>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                onClick={recheckAdminStatus}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Recheck Access
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminProtection;
