import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

interface MFAVerificationProps {
  onSuccess: (result: any) => void;
  onCancel: () => void;
}

export const MFAVerification: React.FC<MFAVerificationProps> = ({ onSuccess, onCancel }) => {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useBackupCode, setUseBackupCode] = useState(false);

  const verifyMFA = async () => {
    if (!code.trim()) return;

    setIsVerifying(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/v1/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-MFA-Code': code.trim(),
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        if (result.method === 'backup_code') {
          toast.success(`Backup code used. ${result.backup_codes_remaining} codes remaining.`);
        } else {
          toast.success('MFA verification successful!');
        }
        onSuccess(result);
      } else {
        setError(result.error || 'Verification failed');
        setCode('');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isVerifying) {
      verifyMFA();
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-center mb-6">Two-Factor Authentication</h2>

      <div className="space-y-4">
        <div className="text-center">
          <p className="text-gray-700 text-sm mb-4">
            {useBackupCode
              ? 'Enter one of your backup codes:'
              : 'Enter the 6-digit code from your authenticator app:'}
          </p>
        </div>

        <input
          type="text"
          value={code}
          onChange={(e) => {
            if (useBackupCode) {
              setCode(e.target.value.toUpperCase());
            } else {
              setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
            }
          }}
          onKeyPress={handleKeyPress}
          placeholder={useBackupCode ? 'XXXXXXXX' : '000000'}
          className="w-full px-4 py-2 border border-gray-300 rounded-md text-center font-mono text-lg"
          maxLength={useBackupCode ? undefined : 6}
          autoComplete="off"
          autoFocus
        />

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={verifyMFA}
          disabled={
            isVerifying ||
            (!useBackupCode && code.length !== 6) ||
            (useBackupCode && !code.trim())
          }
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isVerifying ? 'Verifying...' : 'Verify'}
        </button>

        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <button
            onClick={onCancel}
            disabled={isVerifying}
            className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setCode('');
              setError(null);
            }}
            disabled={isVerifying}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            {useBackupCode ? 'Use authenticator app' : 'Use backup code'}
          </button>
        </div>
      </div>
    </div>
  );
};