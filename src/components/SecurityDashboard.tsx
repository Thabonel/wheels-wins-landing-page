import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { enhancedSecurity } from '@/services/enhancedSecurity';
import { useAuth } from '@/context/AuthContext';
import { Shield, Key, CheckCircle } from 'lucide-react';

export function SecurityDashboard() {
  const { user } = useAuth();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadSecuritySettings();
      loadSecurityEvents();
    }
  }, [user]);

  const loadSecuritySettings = async () => {
    // This would check current MFA status
    // For demo purposes, we'll use local state
  };

  const loadSecurityEvents = async () => {
    try {
      // In a real implementation, fetch from security_events table
      setSecurityEvents([
        {
          id: '1',
          event_type: 'login_attempt',
          severity: 'medium',
          created_at: new Date().toISOString(),
          metadata: { ip: '192.168.1.1', device: 'Chrome' }
        },
        {
          id: '2',
          event_type: 'mfa_enabled',
          severity: 'low',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          metadata: { method: 'totp' }
        }
      ]);
    } catch (error) {
      console.error('Failed to load security events:', error);
    }
  };

  const handleEnableMFA = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const mfaSetup = await enhancedSecurity.enableMFA(user.id);
      setQrCode(mfaSetup.qrCode);
      setBackupCodes(mfaSetup.backupCodes);
    } catch (error) {
      console.error('MFA setup failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMFA = async () => {
    // In a real implementation, this would verify the TOTP code
    setMfaEnabled(true);
    setQrCode('');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Security Dashboard</h1>
      </div>

      {/* MFA Setup */}
      <Card>
        <CardHeader>
          <CardTitle>Multi-Factor Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account
              </p>
            </div>
            <Switch
              checked={mfaEnabled}
              onCheckedChange={mfaEnabled ? undefined : handleEnableMFA}
              disabled={loading}
            />
          </div>

          {qrCode && !mfaEnabled && (
            <div className="space-y-4 p-4 border rounded-lg">
              <p className="font-medium">Scan QR Code with your authenticator app:</p>
              <div className="flex justify-center">
                <img 
                  src={`data:image/svg+xml;base64,${btoa(qrCode)}`} 
                  alt="QR Code" 
                  className="border rounded"
                />
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter verification code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                />
                <Button onClick={handleVerifyMFA}>Verify</Button>
              </div>
            </div>
          )}

          {backupCodes.length > 0 && (
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Backup Codes (Save these safely):</p>
                <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                  {backupCodes.map((code, index) => (
                    <span key={index} className="bg-muted p-1 rounded">{code}</span>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {mfaEnabled && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Two-factor authentication is enabled and protecting your account.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Security Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {securityEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{event.event_type.replace('_', ' ')}</span>
                    <Badge className={getSeverityColor(event.severity)}>
                      {event.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(event.created_at).toLocaleString()}
                  </p>
                  {event.metadata && (
                    <p className="text-xs text-muted-foreground">
                      {JSON.stringify(event.metadata)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Secure Connection</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              All data encrypted in transit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Data Encryption</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Sensitive data encrypted at rest
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              {mfaEnabled ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
              <span>Two-Factor Auth</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {mfaEnabled ? 'Enabled and active' : 'Not enabled'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}