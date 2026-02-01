/**
 * Secure Authentication Components
 *
 * Comprehensive authentication and security components for Phase 2 implementation
 */

export { MFASetup } from './MFASetup';
export { MFAVerification } from './MFAVerification';
export { SessionManager } from './SessionManager';
export { SecuritySettings } from './SecuritySettings';

// Re-export auth service and hooks for convenience
export { secureAuthService } from '@/services/auth/secureAuthService';
export { useSecureAuth, AuthProvider, useMFA, useSessionManagement } from '@/hooks/useSecureAuth';

// Types
export type {
  AuthUser,
  LoginCredentials,
  RegisterData,
  ApiResponse,
  AuthTokens,
} from '@/services/auth/secureAuthService';