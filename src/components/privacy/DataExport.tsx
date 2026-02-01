/**
 * Data Export Component
 * GDPR Article 15 & 20 - Right to access and data portability
 * Allows users to export their personal data in machine-readable formats
 */

import React, { useState } from 'react';
import { Download, Mail, FileText, Database, Shield, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ExportOptions {
  format: 'json' | 'csv' | 'xml';
  includeMetadata: boolean;
  emailDelivery: boolean;
  portabilityMode: boolean;
}

interface ExportStatus {
  status: 'idle' | 'exporting' | 'completed' | 'error';
  message: string;
  downloadUrl?: string;
  exportSize?: number;
}

export default function DataExport() {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    includeMetadata: true,
    emailDelivery: false,
    portabilityMode: false
  });

  const [exportStatus, setExportStatus] = useState<ExportStatus>({
    status: 'idle',
    message: ''
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);
    setExportStatus({ status: 'exporting', message: 'Preparing your data export...' });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      const endpoint = exportOptions.portabilityMode ? '/api/v1/privacy/portability' : '/api/v1/privacy/export';

      const requestBody = exportOptions.portabilityMode ? {
        destination_format: exportOptions.format,
        include_derived_data: exportOptions.includeMetadata,
        target_system: 'user_download'
      } : {
        format: exportOptions.format,
        include_metadata: exportOptions.includeMetadata,
        email_delivery: exportOptions.emailDelivery
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8001'}${endpoint}`, {
        method: exportOptions.portabilityMode ? 'POST' : 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        ...(exportOptions.portabilityMode && { body: JSON.stringify(requestBody) })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Export failed');
      }

      if (exportOptions.emailDelivery) {
        const result = await response.json();
        setExportStatus({
          status: 'completed',
          message: `Export will be emailed to you within 24 hours. Estimated size: ${result.data_size_mb}MB`
        });
      } else {
        // Handle file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `wheels_wins_data_export.${exportOptions.format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setExportStatus({
          status: 'completed',
          message: 'Data export downloaded successfully',
          exportSize: blob.size
        });
      }

    } catch (error: any) {
      console.error('Export failed:', error);
      setExportStatus({
        status: 'error',
        message: error.message || 'Export failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-xl border border-sage-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-sage-100 rounded-lg">
          <Download className="h-5 w-5 text-sage-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-charcoal-900">Export Your Data</h3>
          <p className="text-sm text-charcoal-600">
            Download all your personal data in a machine-readable format
          </p>
        </div>
      </div>

      {/* GDPR Rights Information */}
      <div className="bg-sage-50 border border-sage-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-sage-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-sage-900 mb-1">Your GDPR Rights</h4>
            <p className="text-sm text-sage-700 mb-2">
              Under GDPR Articles 15 & 20, you have the right to:
            </p>
            <ul className="text-sm text-sage-700 space-y-1">
              <li>• Access all personal data we hold about you</li>
              <li>• Receive your data in a portable, machine-readable format</li>
              <li>• Transfer your data to another service provider</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="space-y-4 mb-6">
        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium text-charcoal-700 mb-2">
            Export Format
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'json', label: 'JSON', description: 'Machine-readable' },
              { value: 'csv', label: 'CSV', description: 'Spreadsheet format' },
              { value: 'xml', label: 'XML', description: 'Structured data' }
            ].map((format) => (
              <button
                key={format.value}
                onClick={() => setExportOptions(prev => ({ ...prev, format: format.value as any }))}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  exportOptions.format === format.value
                    ? 'border-sage-300 bg-sage-50'
                    : 'border-sage-200 hover:border-sage-300'
                }`}
              >
                <div className="font-medium text-charcoal-900">{format.label}</div>
                <div className="text-sm text-charcoal-600">{format.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Export Options */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-charcoal-900">Include Metadata</div>
              <div className="text-sm text-charcoal-600">
                Include data creation dates, retention policies, and GDPR information
              </div>
            </div>
            <button
              onClick={() => setExportOptions(prev => ({
                ...prev,
                includeMetadata: !prev.includeMetadata
              }))}
              className={`w-12 h-6 rounded-full transition-colors ${
                exportOptions.includeMetadata ? 'bg-sage-600' : 'bg-sage-200'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                exportOptions.includeMetadata ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-charcoal-900 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Delivery
              </div>
              <div className="text-sm text-charcoal-600">
                Send export file to your registered email address
              </div>
            </div>
            <button
              onClick={() => setExportOptions(prev => ({
                ...prev,
                emailDelivery: !prev.emailDelivery
              }))}
              className={`w-12 h-6 rounded-full transition-colors ${
                exportOptions.emailDelivery ? 'bg-sage-600' : 'bg-sage-200'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                exportOptions.emailDelivery ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-charcoal-900 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Data Portability Mode
              </div>
              <div className="text-sm text-charcoal-600">
                Optimize export for transfer to another service
              </div>
            </div>
            <button
              onClick={() => setExportOptions(prev => ({
                ...prev,
                portabilityMode: !prev.portabilityMode
              }))}
              className={`w-12 h-6 rounded-full transition-colors ${
                exportOptions.portabilityMode ? 'bg-sage-600' : 'bg-sage-200'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                exportOptions.portabilityMode ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Status Display */}
      {exportStatus.status !== 'idle' && (
        <div className={`rounded-lg p-4 mb-4 ${
          exportStatus.status === 'error'
            ? 'bg-red-50 border border-red-200'
            : exportStatus.status === 'completed'
            ? 'bg-green-50 border border-green-200'
            : 'bg-sage-50 border border-sage-200'
        }`}>
          <div className="flex items-center gap-2">
            {exportStatus.status === 'exporting' && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-sage-600 border-t-transparent" />
            )}
            {exportStatus.status === 'completed' && (
              <div className="h-4 w-4 bg-green-500 rounded-full flex items-center justify-center">
                <div className="h-2 w-2 bg-white rounded-full" />
              </div>
            )}
            {exportStatus.status === 'error' && (
              <div className="h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                <div className="h-2 w-2 bg-white rounded-full" />
              </div>
            )}
            <span className={`text-sm font-medium ${
              exportStatus.status === 'error'
                ? 'text-red-700'
                : exportStatus.status === 'completed'
                ? 'text-green-700'
                : 'text-sage-700'
            }`}>
              {exportStatus.message}
            </span>
          </div>
          {exportStatus.exportSize && (
            <div className="text-sm text-green-600 mt-1">
              Export size: {formatFileSize(exportStatus.exportSize)}
            </div>
          )}
        </div>
      )}

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={isLoading}
        className="w-full bg-sage-600 hover:bg-sage-700 disabled:bg-sage-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            Preparing Export...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            {exportOptions.emailDelivery ? 'Send Export via Email' : 'Download Data Export'}
          </>
        )}
      </button>

      {/* Information Footer */}
      <div className="mt-4 p-3 bg-sage-50 rounded-lg">
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 text-sage-600 mt-0.5" />
          <div className="text-sm text-sage-700">
            <strong>Response Time:</strong> Exports are typically available immediately.
            Large datasets may take up to 24 hours for email delivery. You'll receive
            a notification when your export is ready.
          </div>
        </div>
      </div>
    </div>
  );
}