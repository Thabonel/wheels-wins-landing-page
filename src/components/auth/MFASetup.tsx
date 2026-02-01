import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-hot-toast';

interface MFASetupData {
  secret: string;
  qr_code_data: string;
  backup_codes: string[];
  setup_url: string;
}

interface MFASetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const MFASetup: React.FC<MFASetupProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<'loading' | 'qr' | 'verify' | 'backup'>('loading');
  const [setupData, setSetupData] = useState<MFASetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [backupCodesDownloaded, setBackupCodesDownloaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initiateSetup();
  }, []);

  const initiateSetup = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/v1/auth/mfa/setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to setup MFA');
      }

      const data = await response.json();
      setSetupData(data);
      setStep('qr');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
      toast.error('Failed to setup MFA. Please try again.');
    }
  };

  const verifyCode = async () => {
    if (!verificationCode || !setupData) return;

    setIsVerifying(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/v1/auth/mfa/verify-setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('MFA enabled successfully!');
        setStep('backup');
      } else {
        setError(result.error || 'Verification failed');
        setVerificationCode('');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const downloadBackupCodes = () => {
    if (!setupData) return;

    const codesText = setupData.backup_codes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'wheels-wins-backup-codes.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    setBackupCodesDownloaded(true);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  if (step === 'loading') {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Setting up multi-factor authentication...</p>
        </div>
      </div>
    );
  }

  if (step === 'qr') {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6">Setup Two-Factor Authentication</h2>

        <div className="space-y-4">
          <p className="text-gray-700 text-sm">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </p>

          <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
            {setupData && (
              <QRCodeSVG
                value={setupData.setup_url}
                size={200}
                bgColor="white"
                fgColor="black"
              />
            )}
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500 mb-2">Or enter this code manually:</p>
            <div className="bg-gray-100 p-2 rounded font-mono text-sm">
              {setupData?.secret}
              <button
                onClick={() => copyToClipboard(setupData?.secret || '')}
                className="ml-2 text-blue-600 hover:text-blue-800"
                title="Copy to clipboard"
              >
                📋
              </button>
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => setStep('verify')}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6">Verify Setup</h2>

        <div className="space-y-4">
          <p className="text-gray-700 text-sm">
            Enter the 6-digit code from your authenticator app to complete setup:
          </p>

          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-center font-mono text-lg"
            maxLength={6}
            autoComplete="off"
          />

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="flex space-x-3 mt-6">
            <button
              onClick={() => setStep('qr')}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={verifyCode}
              disabled={verificationCode.length !== 6 || isVerifying}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isVerifying ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'backup') {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6">Save Backup Codes</h2>

        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-amber-800 text-sm font-medium">
              ⚠️ Important: Save these backup codes in a secure location.
            </p>
            <p className="text-amber-700 text-sm mt-1">
              You can use them to access your account if you lose your authenticator device.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-2">
              {setupData?.backup_codes.map((code, index) => (
                <div key={index} className="font-mono text-sm bg-white p-2 rounded border">
                  {code}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={downloadBackupCodes}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              📥 Download Backup Codes
            </button>

            <button
              onClick={() => copyToClipboard(setupData?.backup_codes.join('\n') || '')}
              className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              📋 Copy to Clipboard
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="codes-saved"
              checked={backupCodesDownloaded}
              onChange={(e) => setBackupCodesDownloaded(e.target.checked)}
              className="h-4 w-4 text-blue-600"
            />
            <label htmlFor="codes-saved" className="text-sm text-gray-700">
              I have safely stored my backup codes
            </label>
          </div>

          <button
            onClick={onComplete}
            disabled={!backupCodesDownloaded}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Complete Setup
          </button>
        </div>
      </div>
    );
  }

  return null;
};