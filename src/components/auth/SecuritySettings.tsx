import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Shield,
  Smartphone,
  Key,
  RefreshCcw,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Plus
} from 'lucide-react';

import { MFASetup } from './MFASetup';
import { SessionManager } from './SessionManager';
import { MFAVerification } from './MFAVerification';

interface SecuritySettings {
  mfa_enabled: boolean;
  active_sessions: number;
  last_login?: string;
}

interface MFAStatus {
  enabled: boolean;
  backup_codes_remaining: number;
  last_used?: string;
  setup_date?: string;
}

export function SecuritySettings() {
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [showMFAVerification, setShowMFAVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [settingsResponse, mfaResponse] = await Promise.all([
        fetch('/api/v1/auth/security', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          }
        }),
        fetch('/api/v1/auth/mfa/status', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          }
        })
      ]);

      if (!settingsResponse.ok || !mfaResponse.ok) {
        throw new Error('Failed to load security settings');
      }

      const [settingsData, mfaData] = await Promise.all([
        settingsResponse.json(),
        mfaResponse.json()
      ]);

      setSettings(settingsData);
      setMfaStatus(mfaData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const disableMFA = async () => {
    setActionLoading('disable-mfa');
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/mfa/disable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to disable MFA');
      }

      await loadSecuritySettings();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable MFA');
    } finally {
      setActionLoading(null);
    }
  };

  const regenerateBackupCodes = async (mfaCode: string) => {
    setActionLoading('regenerate-codes');
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/mfa/regenerate-backup-codes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'X-MFA-Code': mfaCode,
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to regenerate backup codes');
      }

      const data = await response.json();

      // Download new backup codes
      const content = [
        'Wheels & Wins - MFA Backup Codes (Regenerated)',
        '===============================================',
        '',
        'These are your new backup codes. Your previous codes are no longer valid.',
        'Each code can only be used once. Store them safely!',
        '',
        ...data.backup_codes.map((code: string, index: number) => `${index + 1}. ${code}`),
        '',
        `Generated on: ${new Date().toLocaleString()}`
      ].join('\n');

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wheels-wins-backup-codes-new.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setShowMFAVerification(false);
      await loadSecuritySettings();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate backup codes');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMFASetupComplete = () => {
    setShowMFASetup(false);
    loadSecuritySettings();
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              Loading security settings...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showMFASetup) {
    return (
      <div className="space-y-6">
        <MFASetup
          onSetupComplete={handleMFASetupComplete}
          onCancel={() => setShowMFASetup(false)}
        />
      </div>
    );
  }

  if (showMFAVerification) {
    return (
      <div className="space-y-6">
        <MFAVerification
          onVerificationComplete={regenerateBackupCodes}
          onCancel={() => setShowMFAVerification(false)}
          isLoading={actionLoading === 'regenerate-codes'}
          error={error}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Security Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Overview
          </CardTitle>
          <CardDescription>
            Manage your account security settings and monitor access activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <div className={`p-2 rounded-full ${mfaStatus?.enabled ? 'bg-green-100' : 'bg-yellow-100'}`}>
                {mfaStatus?.enabled ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-yellow-600" />
                )}
              </div>
              <div>
                <div className="font-medium">Two-Factor Authentication</div>
                <div className="text-sm text-gray-600">
                  {mfaStatus?.enabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="p-2 rounded-full bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">Active Sessions</div>
                <div className="text-sm text-gray-600">
                  {settings?.active_sessions || 0} device{(settings?.active_sessions || 0) !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="p-2 rounded-full bg-purple-100">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="font-medium">Last Login</div>
                <div className="text-sm text-gray-600">
                  {formatDate(settings?.last_login)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account with TOTP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">MFA Status</span>
                <Badge variant={mfaStatus?.enabled ? "default" : "secondary"}>
                  {mfaStatus?.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              {mfaStatus?.enabled && (
                <div className="text-sm text-gray-600">
                  Setup date: {formatDate(mfaStatus.setup_date)} •
                  Last used: {formatDate(mfaStatus.last_used)} •
                  Backup codes remaining: {mfaStatus.backup_codes_remaining}
                </div>
              )}
            </div>

            {mfaStatus?.enabled ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowMFAVerification(true)}
                  disabled={actionLoading === 'regenerate-codes'}
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  {actionLoading === 'regenerate-codes' ? 'Generating...' : 'New Backup Codes'}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={actionLoading === 'disable-mfa'}
                      className="text-red-600 hover:text-red-700"
                    >
                      {actionLoading === 'disable-mfa' ? 'Disabling...' : 'Disable MFA'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the extra security layer from your account.
                        You'll only need your password to log in. This action requires MFA verification.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={disableMFA}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Disable MFA
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : (
              <Button onClick={() => setShowMFASetup(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Enable MFA
              </Button>
            )}
          </div>

          {!mfaStatus?.enabled && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Recommended:</strong> Enable two-factor authentication to significantly
                improve your account security. It takes just a few minutes to set up.
              </AlertDescription>
            </Alert>
          )}

          {mfaStatus?.enabled && mfaStatus.backup_codes_remaining <= 2 && (
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> You have {mfaStatus.backup_codes_remaining} backup codes remaining.
                Consider generating new backup codes to ensure you can always access your account.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Session Management */}
      <SessionManager />

      {/* Security Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Security Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Use a strong, unique password for your account</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Enable two-factor authentication for enhanced security</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Regularly review your active sessions and revoke unrecognized ones</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Keep your backup codes in a secure location</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Log out from public or shared devices after use</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}