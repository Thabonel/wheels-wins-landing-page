/**
 * Staging environment configuration
 * Provides bypass options for staging testing
 */

export const isStaging = () => {
  const hostname = window.location.hostname;
  return hostname.includes('staging--') || hostname.includes('staging.');
};

export const isStagingBypassEnabled = () => {
  // Enable bypass only on staging environments
  if (!isStaging()) return false;
  
  // Check for bypass query parameter or localStorage flag
  const urlParams = new URLSearchParams(window.location.search);
  const bypassParam = urlParams.get('bypass') === 'true';
  const bypassStorage = localStorage.getItem('staging_bypass') === 'true';
  
  return bypassParam || bypassStorage;
};

export const enableStagingBypass = () => {
  if (isStaging()) {
    localStorage.setItem('staging_bypass', 'true');
    console.log('🔓 Staging bypass enabled');
  }
};

export const disableStagingBypass = () => {
  localStorage.removeItem('staging_bypass');
  console.log('🔒 Staging bypass disabled');
};

// Mock user for staging bypass
export const mockStagingUser = {
  id: 'staging-user-001',
  email: 'staging@wheelsandwins.com',
  full_name: 'Staging Test User'
};

// Mock session for staging bypass
export const mockStagingSession = {
  access_token: 'staging-mock-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  refresh_token: 'staging-mock-refresh',
  user: {
    id: 'staging-user-001',
    email: 'staging@wheelsandwins.com',
    app_metadata: {},
    user_metadata: { full_name: 'Staging Test User' },
    aud: 'authenticated',
    created_at: new Date().toISOString()
  }
};