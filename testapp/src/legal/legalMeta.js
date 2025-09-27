// Centralized legal metadata and controller stub
// Replace placeholders with finalized, counsel-approved data prior to production.

// Final (non-draft) published versions. Increment semver (major/minor/patch) on material change.
export const PRIVACY_POLICY_VERSION = 'PP-1.0.0';
export const PRIVACY_POLICY_LAST_UPDATED = '2025-09-22';
export const TERMS_VERSION = 'TOS-1.0.0';
export const TERMS_LAST_UPDATED = '2025-09-22';

// Controller / Operating Entity (TO FILL)
export const CONTROLLER_INFO = {
  name: 'Schedulink Labs',
  address: 'Example Street 123, Madrid, Spain',
  country: 'Spain',
  registrationNumber: 'N/A',
  representative: '', // Fill if an EU/UK representative becomes required
};

// Support contact (placeholder until real mailbox is active)
// Support email: use Vite client env variable. Avoid process.env in client code (undefined in browser unless polyfilled).
export const SUPPORT_EMAIL = (import.meta?.env?.VITE_SUPPORT_EMAIL) || 'support@schedulink.example';

// Simple helper to detect draft state
export const isDraftLegal = () => PRIVACY_POLICY_VERSION.includes('DRAFT') || TERMS_VERSION.includes('DRAFT');
