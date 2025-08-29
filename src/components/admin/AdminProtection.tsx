import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminProtectionProps {
  children: React.ReactNode;
}

// Super admin email with permanent access
const SUPER_ADMIN_EMAIL = 'thabonel0@gmail.com';

const AdminProtection: React.FC<AdminProtectionProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (authLoading) return;
      
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // Super admin always has access
        if (user.email === SUPER_ADMIN_EMAIL) {
          setIsAdmin(true);
          setLoading(false);
          return;
        }

        // Check if user is in admin_users table
        const { data, error } = await supabase
          .from('admin_users')
          .select('role, status, email')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (error) {
          console.error('Error checking admin status:', error);
          // If table access fails but user is super admin, still grant access
          if (user.email === SUPER_ADMIN_EMAIL) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
            setError('Unable to verify admin status');
          }
        } else {
          setIsAdmin(data?.role === 'admin' || user.email === SUPER_ADMIN_EMAIL);
        }
      } catch (err) {
        console.error('Admin check failed:', err);
        // Fallback: super admin always has access even if DB fails
        if (user.email === SUPER_ADMIN_EMAIL) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          setError('Admin verification failed');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, authLoading]);

  // Show loading while checking authentication and admin status
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-600">Verifying admin access...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto text-blue-600 mb-4" />
            <CardTitle className="text-2xl">Admin Access Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You must be logged in to access the admin panel.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Button 
                onClick={() => navigate('/login')} 
                className="w-full"
              >
                Login
              </Button>
              <Button 
                onClick={() => navigate('/')} 
                variant="outline" 
                className="w-full"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show access denied if not admin (but never deny super admin)
  if (isAdmin === false && user.email !== SUPER_ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto text-red-600 mb-4" />
            <CardTitle className="text-2xl">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You don't have admin privileges to access this area.
                {error && ` ${error}`}
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Button 
                onClick={() => navigate('/')} 
                className="w-full"
              >
                Back to Home
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                className="w-full"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render admin panel for verified admins or super admin
  return <>{children}</>;
};

export default AdminProtection;