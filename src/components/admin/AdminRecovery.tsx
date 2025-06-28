
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AdminRecovery: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleBootstrapAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('bootstrap_admin_user', {
        user_email: email.trim()
      });

      if (error) {
        toast.error(`Failed to bootstrap admin: ${error.message}`);
      } else {
        setSuccess(true);
        toast.success('Admin access bootstrapped successfully!');
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
      console.error('Bootstrap error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Admin Access Granted</h2>
          <p className="text-gray-600 mb-4">
            Admin access has been successfully configured for {email}.
          </p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin Recovery
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleBootstrapAdmin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter admin email address"
              required
            />
          </div>
          
          <div className="bg-blue-50 p-3 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Recovery Process:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Enter the email of the user who should have admin access</li>
                  <li>The user must already be registered in the system</li>
                  <li>This will grant admin privileges to the specified user</li>
                </ul>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Bootstrapping Admin...
              </>
            ) : (
              'Bootstrap Admin Access'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdminRecovery;
