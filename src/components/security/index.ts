/**
 * Security Components Index
 * Exports all security-related components for easy importing
 */

export { SecurityDashboard } from './SecurityDashboard';
export { AuditLog } from './AuditLog';
export { ThreatDetection } from './ThreatDetection';
export { IncidentResponse } from './IncidentResponse';

// Re-export for backward compatibility
export { SecurityDashboard as default } from './SecurityDashboard';