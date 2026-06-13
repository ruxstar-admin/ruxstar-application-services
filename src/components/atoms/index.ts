/**
 * Atoms — barrel export
 *
 * The smallest indivisible UI building blocks.
 * No business logic. No API calls. Pure presentational.
 *
 * Import from here: import { Badge, ProgressBar } from '@/components/atoms';
 */

// Re-export existing atoms from their original locations
export { default as Button } from '@/components/ui/PrimaryButton';
export { default as InputField } from '@/components/ui/InputField';
export { default as GradientBackground } from '@/components/ui/GradientBackground';

// New atoms
export { default as Badge } from './Badge';
export { default as ProgressBar } from './ProgressBar';
export { default as CountdownTimer } from './CountdownTimer';
export { default as Divider } from './Divider';
