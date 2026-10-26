import { ApiError } from '@/lib/api-error';
import type { StepDef } from './flows';

const GENERIC = 'Something went wrong. Please try again.';

/** Friendly copy for a failed step. Screens never show raw server text. */
export const kycErrorMessage = (err: unknown, kind: StepDef['kind'], stepId: string): string => {
  if (!(err instanceof ApiError)) return GENERIC;

  switch (err.kind) {
    case 'network':
      return 'No internet connection. Check your network and try again.';
    case 'timeout':
      return 'This is taking longer than usual. Please try again.';
    case 'rate_limited':
      return 'Too many attempts. Please wait a minute and try again.';
    case 'server':
      return GENERIC;
    default:
      break;
  }

  if (kind === 'otp') return 'That code is incorrect or has expired.';
  if (stepId === 'bank') return 'We could not verify this bank account. Check the number and IFSC.';
  if (err.kind === 'unauthorized') return 'Your session expired. Log in again to continue.';
  return GENERIC;
};
