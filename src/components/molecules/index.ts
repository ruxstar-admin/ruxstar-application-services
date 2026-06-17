/**
 * Molecules — barrel export
 *
 * Atoms combined to serve a single focused purpose.
 * May hold local UI state, but no global store access.
 *
 * Import from here: import { FormField, SocialLoginButton } from '@/components/molecules';
 */

// Re-export existing molecules from their original locations
export { default as PhoneInput } from '@/components/auth/PhoneInput';
export { default as OtpInput } from '@/components/auth/OtpInput';
export { default as RoleCard } from '@/components/auth/RoleCard';

// New molecules
export { default as FormField } from './FormField';
export { default as SocialLoginButton } from './SocialLoginButton';
