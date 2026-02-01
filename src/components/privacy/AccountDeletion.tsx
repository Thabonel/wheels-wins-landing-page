/**
 * Account Deletion Component
 * GDPR Article 17 - Right to erasure ("Right to be forgotten")
 * Provides secure account and data deletion with proper verification
 */

import React, { useState } from 'react';
import { Trash2, Shield, AlertTriangle, Check, Clock, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DeletionOptions {
  confirmDeletion: boolean;
  backupBeforeDeletion: boolean;
  deletionReason: string;
}

interface DeletionStatus {
  status: 'idle' | 'confirming' | 'deleting' | 'completed' | 'error';
  message: string;
  deletionSummary?: any;
}

export default function AccountDeletion() {
  const [deletionOptions, setDeletionOptions] = useState<DeletionOptions>({
    confirmDeletion: false,
    backupBeforeDeletion: true,
    deletionReason: ''
  });

  const [deletionStatus, setDeletionStatus] = useState<DeletionStatus>({
    status: 'idle',
    message: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');

  const deletionReasons = [
    'No longer need the service',
    'Privacy concerns',
    'Found alternative solution',
    'Account security concerns',
    'Data minimization preference',
    'Other (specify below)'
  ];

  const handleDeleteAccount = async () => {
    if (confirmationText !== 'DELETE MY ACCOUNT') {
      setDeletionStatus({
        status: 'error',
        message: 'Please type "DELETE MY ACCOUNT" exactly to confirm'
      });
      return;
    }

    setIsLoading(true);
    setDeletionStatus({
      status: 'deleting',
      message: 'Processing account deletion request...'
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/api/v1/privacy/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirm_deletion: true,
          backup_before_deletion: deletionOptions.backupBeforeDeletion,
          deletion_reason: deletionOptions.deletionReason
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Account deletion failed');
      }

      const result = await response.json();
      setDeletionStatus({
        status: 'completed',
        message: 'Account deletion completed successfully',
        deletionSummary: result.deletion_summary
      });

      // Sign out user after successful deletion
      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
      }, 3000);

    } catch (error: any) {
      console.error('Account deletion failed:', error);
      setDeletionStatus({
        status: 'error',
        message: error.message || 'Account deletion failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startDeletion = () => {
    if (!deletionOptions.confirmDeletion) {
      setDeletionStatus({
        status: 'error',
        message: 'Please confirm that you understand the consequences of account deletion'
      });
      return;
    }

    setShowConfirmation(true);
  };

  return (
    <div className="bg-white rounded-xl border border-red-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-red-100 rounded-lg">
          <Trash2 className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-charcoal-900">Delete Your Account</h3>
          <p className="text-sm text-charcoal-600">
            Permanently remove your account and all associated data
          </p>
        </div>
      </div>

      {/* GDPR Rights Information */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-red-900 mb-1">Your Right to Erasure (GDPR Article 17)</h4>
            <p className="text-sm text-red-700 mb-2">
              You have the right to have your personal data erased when:
            </p>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• The data is no longer necessary for the original purpose</li>
              <li>• You withdraw consent and there's no other legal basis</li>
              <li>• You object to processing and there are no overriding legitimate grounds</li>
              <li>• The data has been unlawfully processed</li>
            </ul>
          </div>
        </div>
      </div>

      {!showConfirmation ? (
        <>
          {/* Deletion Impact Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900 mb-2">What will be deleted:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <h5 className="font-medium text-amber-800 mb-1">Personal Data</h5>
                    <ul className="text-sm text-amber-700 space-y-0.5">
                      <li>• Profile information</li>
                      <li>• Travel history and preferences</li>
                      <li>• Financial records and budgets</li>
                      <li>• Medical records and emergency info</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-amber-800 mb-1">Activity Data</h5>
                    <ul className="text-sm text-amber-700 space-y-0.5">
                      <li>• Social posts and comments</li>
                      <li>• PAM conversation history</li>
                      <li>• Storage and organization data</li>
                      <li>• Calendar events and reminders</li>
                    </ul>
                  </div>
                </div>
                <p className="text-sm text-amber-700 mt-3 font-medium">
                  This action is irreversible. All data will be permanently deleted.
                </p>
              </div>
            </div>
          </div>

          {/* Deletion Options */}
          <div className="space-y-4 mb-6">
            {/* Reason Selection */}
            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-2">
                Reason for Account Deletion
              </label>
              <select
                value={deletionOptions.deletionReason}
                onChange={(e) => setDeletionOptions(prev => ({
                  ...prev,
                  deletionReason: e.target.value
                }))}
                className="w-full border border-sage-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sage-500 focus:border-transparent"
              >
                <option value="">Select a reason...</option>
                {deletionReasons.map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>

            {/* Additional Comments */}
            {deletionOptions.deletionReason && (
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-2">
                  Additional Comments (Optional)
                </label>
                <textarea
                  value={deletionOptions.deletionReason === 'Other (specify below)' ? '' : deletionOptions.deletionReason}
                  onChange={(e) => setDeletionOptions(prev => ({
                    ...prev,
                    deletionReason: e.target.value
                  }))}
                  placeholder={deletionOptions.deletionReason === 'Other (specify below)' ? 'Please specify your reason...' : 'Any additional feedback...'}
                  className="w-full border border-sage-200 rounded-lg px-3 py-2 h-20 resize-none focus:ring-2 focus:ring-sage-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Backup Option */}
            <div className="flex items-center justify-between p-3 border border-sage-200 rounded-lg">
              <div>
                <div className="font-medium text-charcoal-900 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Create Backup Before Deletion
                </div>
                <div className="text-sm text-charcoal-600">
                  Create encrypted backup for compliance purposes (retained for 30 days)
                </div>
              </div>
              <button
                onClick={() => setDeletionOptions(prev => ({
                  ...prev,
                  backupBeforeDeletion: !prev.backupBeforeDeletion
                }))}
                className={`w-12 h-6 rounded-full transition-colors ${
                  deletionOptions.backupBeforeDeletion ? 'bg-sage-600' : 'bg-sage-200'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  deletionOptions.backupBeforeDeletion ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Confirmation Checkbox */}
            <div className="flex items-start gap-3 p-3 border border-red-200 rounded-lg bg-red-50">
              <button
                onClick={() => setDeletionOptions(prev => ({
                  ...prev,
                  confirmDeletion: !prev.confirmDeletion
                }))}
                className={`w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${
                  deletionOptions.confirmDeletion
                    ? 'border-red-500 bg-red-500'
                    : 'border-red-300 bg-white'
                }`}
              >
                {deletionOptions.confirmDeletion && (
                  <Check className="h-3 w-3 text-white" />
                )}
              </button>
              <div>
                <div className="font-medium text-red-900">
                  I understand the consequences
                </div>
                <div className="text-sm text-red-700">
                  I understand that account deletion is permanent and irreversible.
                  All my data will be permanently deleted and cannot be recovered.
                </div>
              </div>
            </div>
          </div>

          {/* Status Display */}
          {deletionStatus.status !== 'idle' && deletionStatus.status !== 'confirming' && (
            <div className={`rounded-lg p-4 mb-4 ${
              deletionStatus.status === 'error' ? 'bg-red-50 border border-red-200' : 'bg-sage-50 border border-sage-200'
            }`}>
              <div className={`text-sm font-medium ${
                deletionStatus.status === 'error' ? 'text-red-700' : 'text-sage-700'
              }`}>
                {deletionStatus.message}
              </div>
            </div>
          )}

          {/* Delete Button */}
          <button
            onClick={startDeletion}
            disabled={!deletionOptions.deletionReason}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Proceed to Delete Account
          </button>
        </>
      ) : (
        /* Confirmation Step */
        <div className="space-y-6">
          <div className="text-center p-6 bg-red-50 rounded-lg border border-red-200">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Final Confirmation Required
            </h3>
            <p className="text-red-700 mb-4">
              This is your last chance to cancel. Once confirmed, your account and all data will be permanently deleted.
            </p>
            <div className="bg-white p-4 rounded border">
              <label className="block text-sm font-medium text-red-900 mb-2">
                Type "DELETE MY ACCOUNT" to confirm:
              </label>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                className="w-full border border-red-300 rounded px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="DELETE MY ACCOUNT"
              />
            </div>
          </div>

          {/* Status Display */}
          {deletionStatus.status !== 'idle' && deletionStatus.status !== 'confirming' && (
            <div className={`rounded-lg p-4 ${
              deletionStatus.status === 'error'
                ? 'bg-red-50 border border-red-200'
                : deletionStatus.status === 'completed'
                ? 'bg-green-50 border border-green-200'
                : 'bg-sage-50 border border-sage-200'
            }`}>
              <div className="flex items-center gap-2">
                {deletionStatus.status === 'deleting' && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent" />
                )}
                {deletionStatus.status === 'completed' && (
                  <Check className="h-4 w-4 text-green-600" />
                )}
                <span className={`text-sm font-medium ${
                  deletionStatus.status === 'error'
                    ? 'text-red-700'
                    : deletionStatus.status === 'completed'
                    ? 'text-green-700'
                    : 'text-sage-700'
                }`}>
                  {deletionStatus.message}
                </span>
              </div>

              {deletionStatus.deletionSummary && (
                <div className="mt-3 text-sm text-green-700">
                  <div>Records deleted: {deletionStatus.deletionSummary.total_records_deleted}</div>
                  <div>Tables processed: {Object.keys(deletionStatus.deletionSummary.deleted_tables || {}).length}</div>
                  {deletionStatus.deletionSummary.pre_deletion_backup && (
                    <div>Backup created: {deletionStatus.deletionSummary.pre_deletion_backup}</div>
                  )}
                </div>
              )}

              {deletionStatus.status === 'completed' && (
                <div className="mt-2 text-sm text-green-700">
                  You will be signed out and redirected in a few seconds...
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirmation(false)}
              disabled={isLoading}
              className="flex-1 border border-sage-300 text-charcoal-700 font-medium py-3 px-4 rounded-lg hover:bg-sage-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={isLoading || confirmationText !== 'DELETE MY ACCOUNT'}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Account Forever
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Information Footer */}
      <div className="mt-6 p-3 bg-sage-50 rounded-lg">
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 text-sage-600 mt-0.5" />
          <div className="text-sm text-sage-700">
            <strong>Processing Time:</strong> Account deletion is typically completed within 30 days.
            Some data may be retained longer as required by law for accounting, legal, or security purposes.
          </div>
        </div>
      </div>
    </div>
  );
}