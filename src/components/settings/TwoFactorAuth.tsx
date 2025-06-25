
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Shield, QrCode, Copy } from 'lucide-react';
import { useTwoFactorAuth } from '@/hooks/useTwoFactorAuth';
import { toast } from 'sonner';
import QRCode from 'qrcode';

export const TwoFactorAuth = () => {
  const { twoFactorData, loading, setupTwoFactor, verifyAndEnable, disable } = useTwoFactorAuth();
  const [showSetup, setShowSetup] = useState(false);
  const [setupData, setSetupData] = useState<any>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleSetup = async () => {
    const data = await setupTwoFactor();
    if (data) {
      setSetupData(data);
      setShowSetup(true);
      
      // Generate QR code
      try {
        const qrDataUrl = await QRCode.toDataURL(data.qrCodeUrl);
        setQrCodeDataUrl(qrDataUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    }
  };

  const handleVerify = async () => {
    if (!verificationCode) {
      toast.error('Please enter a verification code');
      return;
    }

    setVerifying(true);
    const success = await verifyAndEnable(verificationCode);
    
    if (success) {
      setShowSetup(false);
      setSetupData(null);
      setVerificationCode('');
      setQrCodeDataUrl('');
    }
    
    setVerifying(false);
  };

  const handleDisable = async () => {
    const success = await disable();
    if (success) {
      setShowSetup(false);
      setSetupData(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!twoFactorData?.enabled && !showSetup && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Add an extra layer of security to your account with two-factor authentication.
            </p>
            <Button onClick={handleSetup}>
              Setup Two-Factor Authentication
            </Button>
          </div>
        )}

        {twoFactorData?.enabled && !showSetup && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-600">Two-Factor Authentication Enabled</p>
                <p className="text-sm text-gray-600">Your account is protected with 2FA</p>
              </div>
              <Switch checked={true} disabled />
            </div>
            <Button variant="destructive" onClick={handleDisable}>
              Disable Two-Factor Authentication
            </Button>
          </div>
        )}

        {showSetup && setupData && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Step 1: Scan QR Code</h3>
              <p className="text-sm text-gray-600 mb-4">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
              {qrCodeDataUrl && (
                <div className="flex justify-center">
                  <img src={qrCodeDataUrl} alt="QR Code" className="border rounded" />
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-2">Manual Setup</h3>
              <p className="text-sm text-gray-600 mb-2">
                If you can't scan the QR code, enter this secret key manually:
              </p>
              <div className="flex items-center gap-2">
                <code className="bg-gray-100 px-2 py-1 rounded text-sm flex-1">
                  {setupData.secret}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(setupData.secret)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Step 2: Verify Setup</h3>
              <div className="space-y-2">
                <Label htmlFor="verification-code">Enter 6-digit code from your app</Label>
                <Input
                  id="verification-code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleVerify} disabled={verifying}>
                  {verifying ? 'Verifying...' : 'Verify and Enable'}
                </Button>
                <Button variant="outline" onClick={() => setShowSetup(false)}>
                  Cancel
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Backup Codes</h3>
              <p className="text-sm text-gray-600 mb-2">
                Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {setupData.backupCodes?.map((code: string, index: number) => (
                  <code key={index} className="bg-gray-100 px-2 py-1 rounded text-sm">
                    {code}
                  </code>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => copyToClipboard(setupData.backupCodes?.join('\n'))}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy All Codes
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
