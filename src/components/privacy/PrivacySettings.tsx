/**
 * Privacy Settings Component
 * Comprehensive privacy controls for GDPR consent management and user rights
 * Implements consent preferences, data processing controls, and privacy dashboard
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Eye,
  Settings,
  Database,
  Mail,
  BarChart3,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PrivacyPreferences {
  show_personalized_safety: boolean;
  show_personalized_community: boolean;
  share_gender_with_groups: boolean;
  marketing_consent: boolean;
  analytics_consent: boolean;
  third_party_sharing: boolean;
  data_processing_consent: boolean;
  last_updated?: string;
}

interface PrivacyDashboard {
  user_id: string;
  dashboard_date: string;
  privacy_controls: {
    current_consent: PrivacyPreferences;
    consent_last_updated: string;
    account_created: string;
  };
  data_retention: {
    total_data_age_days: number;
    upcoming_deletions: number;
    table_count: number;
  };
  gdpr_rights: {
    [key: string]: string;
  };
  privacy_score: {
    consent_configured: boolean;
    retention_compliant: boolean;
    overall_rating: string;
  };
}

export default function PrivacySettings() {
  const [preferences, setPreferences] = useState<PrivacyPreferences>({
    show_personalized_safety: false,
    show_personalized_community: false,
    share_gender_with_groups: false,
    marketing_consent: false,
    analytics_consent: false,
    third_party_sharing: false,
    data_processing_consent: true
  });

  const [dashboard, setDashboard] = useState<PrivacyDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<{ type: 'success' | 'error' | '', message: string }>({
    type: '',
    message: ''
  });

  useEffect(() => {
    loadPrivacyDashboard();
  }, []);

  const loadPrivacyDashboard = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/api/v1/privacy/dashboard`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setDashboard(result.dashboard);
        setPreferences({
          ...result.dashboard.privacy_controls.current_consent,
          data_processing_consent: true // Always default to true
        });
      }
    } catch (error) {
      console.error('Failed to load privacy dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePrivacyPreferences = async () => {
    setIsSaving(true);
    setUpdateStatus({ type: '', message: '' });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/api/v1/privacy/consent`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          consent_categories: {
            show_personalized_safety: preferences.show_personalized_safety,
            show_personalized_community: preferences.show_personalized_community,
            share_gender_with_groups: preferences.share_gender_with_groups
          },
          marketing_consent: preferences.marketing_consent,
          analytics_consent: preferences.analytics_consent,
          third_party_sharing: preferences.third_party_sharing
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update preferences');
      }

      setUpdateStatus({
        type: 'success',
        message: 'Privacy preferences updated successfully'
      });

      // Reload dashboard to reflect changes
      setTimeout(() => {
        loadPrivacyDashboard();
        setUpdateStatus({ type: '', message: '' });
      }, 2000);

    } catch (error: any) {
      console.error('Failed to update privacy preferences:', error);
      setUpdateStatus({
        type: 'error',
        message: error.message || 'Failed to update preferences'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const togglePreference = (key: keyof PrivacyPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-sage-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-sage-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-sage-200 rounded"></div>
            <div className="h-4 bg-sage-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Privacy Dashboard Overview */}
      {dashboard && (
        <div className="bg-white rounded-xl border border-sage-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-sage-100 rounded-lg">
              <Shield className="h-5 w-5 text-sage-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-charcoal-900">Privacy Dashboard</h3>
              <p className="text-sm text-charcoal-600">
                Overview of your privacy settings and data rights
              </p>
            </div>
          </div>

          {/* Privacy Score */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-sage-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-sage-600" />
                <span className="text-sm font-medium text-sage-900">Privacy Score</span>
              </div>
              <div className="text-lg font-semibold text-sage-900">
                {dashboard.privacy_score.overall_rating}
              </div>
              <div className="text-sm text-sage-600">
                {dashboard.privacy_score.consent_configured ? 'Consent configured' : 'Needs setup'}
              </div>
            </div>

            <div className="bg-sage-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-sage-600" />
                <span className="text-sm font-medium text-sage-900">Data Age</span>
              </div>
              <div className="text-lg font-semibold text-sage-900">
                {Math.round(dashboard.data_retention.total_data_age_days / 365 * 10) / 10} years
              </div>
              <div className="text-sm text-sage-600">
                Since account creation
              </div>
            </div>

            <div className="bg-sage-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-sage-600" />
                <span className="text-sm font-medium text-sage-900">Data Tables</span>
              </div>
              <div className="text-lg font-semibold text-sage-900">
                {dashboard.data_retention.table_count}
              </div>
              <div className="text-sm text-sage-600">
                {dashboard.data_retention.upcoming_deletions > 0
                  ? `${dashboard.data_retention.upcoming_deletions} due for cleanup`
                  : 'All current'}
              </div>
            </div>
          </div>

          {/* GDPR Rights Summary */}
          <div className="bg-sage-50 border border-sage-200 rounded-lg p-4">
            <h4 className="font-medium text-sage-900 mb-3">Your GDPR Rights</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(dashboard.gdpr_rights).map(([right, description]) => (
                <div key={right} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-sage-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-sage-900 capitalize">
                      {right.replace('_', ' ')}
                    </div>
                    <div className="text-xs text-sage-600">{description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Privacy Preferences */}
      <div className="bg-white rounded-xl border border-sage-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-sage-100 rounded-lg">
            <Settings className="h-5 w-5 text-sage-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-charcoal-900">Privacy Preferences</h3>
            <p className="text-sm text-charcoal-600">
              Control how your data is processed and used
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Personalization Settings */}
          <div>
            <h4 className="font-medium text-charcoal-900 mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Personalization
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border border-sage-200 rounded-lg">
                <div>
                  <div className="font-medium text-charcoal-900">Personalized Safety Resources</div>
                  <div className="text-sm text-charcoal-600">
                    Show safety tips and resources tailored to your travel style
                  </div>
                </div>
                <button
                  onClick={() => togglePreference('show_personalized_safety')}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    preferences.show_personalized_safety ? 'bg-sage-600' : 'bg-sage-200'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    preferences.show_personalized_safety ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 border border-sage-200 rounded-lg">
                <div>
                  <div className="font-medium text-charcoal-900">Personalized Community Features</div>
                  <div className="text-sm text-charcoal-600">
                    Get recommendations for groups and events based on your interests
                  </div>
                </div>
                <button
                  onClick={() => togglePreference('show_personalized_community')}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    preferences.show_personalized_community ? 'bg-sage-600' : 'bg-sage-200'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    preferences.show_personalized_community ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 border border-sage-200 rounded-lg">
                <div>
                  <div className="font-medium text-charcoal-900 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Share Gender with Groups
                  </div>
                  <div className="text-sm text-charcoal-600">
                    Allow gender-specific groups to appear in your community feed
                  </div>
                </div>
                <button
                  onClick={() => togglePreference('share_gender_with_groups')}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    preferences.share_gender_with_groups ? 'bg-sage-600' : 'bg-sage-200'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    preferences.share_gender_with_groups ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Communication Preferences */}
          <div>
            <h4 className="font-medium text-charcoal-900 mb-3 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Communications
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border border-sage-200 rounded-lg">
                <div>
                  <div className="font-medium text-charcoal-900">Marketing Communications</div>
                  <div className="text-sm text-charcoal-600">
                    Receive updates about new features, tips, and special offers
                  </div>
                </div>
                <button
                  onClick={() => togglePreference('marketing_consent')}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    preferences.marketing_consent ? 'bg-sage-600' : 'bg-sage-200'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    preferences.marketing_consent ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Data Processing */}
          <div>
            <h4 className="font-medium text-charcoal-900 mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Data Processing
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border border-sage-200 rounded-lg">
                <div>
                  <div className="font-medium text-charcoal-900">Analytics Data Processing</div>
                  <div className="text-sm text-charcoal-600">
                    Allow processing of usage data to improve our services
                  </div>
                </div>
                <button
                  onClick={() => togglePreference('analytics_consent')}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    preferences.analytics_consent ? 'bg-sage-600' : 'bg-sage-200'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    preferences.analytics_consent ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 border border-sage-200 rounded-lg">
                <div>
                  <div className="font-medium text-charcoal-900">Third-Party Data Sharing</div>
                  <div className="text-sm text-charcoal-600">
                    Share anonymized data with trusted partners for research purposes
                  </div>
                </div>
                <button
                  onClick={() => togglePreference('third_party_sharing')}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    preferences.third_party_sharing ? 'bg-sage-600' : 'bg-sage-200'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    preferences.third_party_sharing ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Essential Processing Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-900 text-sm">Essential Data Processing</div>
                    <div className="text-sm text-blue-700">
                      Some data processing is essential for the service to function and cannot be disabled.
                      This includes account management, security, and core features.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Update Status */}
        {updateStatus.type && (
          <div className={`mt-4 p-3 rounded-lg ${
            updateStatus.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className={`text-sm font-medium ${
              updateStatus.type === 'success' ? 'text-green-700' : 'text-red-700'
            }`}>
              {updateStatus.message}
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-6">
          <button
            onClick={updatePrivacyPreferences}
            disabled={isSaving}
            className="w-full bg-sage-600 hover:bg-sage-700 disabled:bg-sage-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Updating Preferences...
              </>
            ) : (
              <>
                <Settings className="h-4 w-4" />
                Update Privacy Preferences
              </>
            )}
          </button>
        </div>

        {/* Last Updated Info */}
        {dashboard?.privacy_controls.consent_last_updated && (
          <div className="mt-4 text-center text-sm text-charcoal-600">
            Last updated: {formatDate(dashboard.privacy_controls.consent_last_updated)}
          </div>
        )}

        {/* Information Footer */}
        <div className="mt-6 p-3 bg-sage-50 rounded-lg">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-sage-600 mt-0.5" />
            <div className="text-sm text-sage-700">
              <strong>Your Rights:</strong> You can change these preferences at any time.
              Under GDPR, you have the right to access, rectify, erase, restrict, and port your data.
              You can also withdraw consent at any time without affecting the lawfulness of previous processing.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}