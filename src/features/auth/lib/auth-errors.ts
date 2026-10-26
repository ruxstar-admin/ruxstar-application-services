import { ApiError } from '@/lib/api-error';

/** Where an error should be shown: under a specific field, or as a banner for the whole form. */
export type AuthErrorTarget = 'mobile' | 'password' | 'otp' | 'form';

export interface AuthError {
  message: string;
  target: AuthErrorTarget;
  /** True for failures worth retrying as-is (offline, timeout, server). */
  retryable: boolean;
}

export type AuthAction =
  | 'login-password'
  | 'login-otp-send'
  | 'signup-otp-send'
  | 'forgot-otp-send'
  | 'otp-verify'
  | 'signup-complete'
  | 'password-reset';

const GENERIC: AuthError = { message: 'Something went wrong. Please try again.', target: 'form', retryable: true };

/** Single place that turns any thrown value into friendly copy — screens never read `err.message`. */
export const toAuthError = (err: unknown, action: AuthAction): AuthError => {
  if (!(err instanceof ApiError)) return GENERIC;

  switch (err.kind) {
    case 'network':
      return { message: 'No internet connection. Check your network and try again.', target: 'form', retryable: true };
    case 'timeout':
      return { message: 'This is taking longer than usual. Please try again.', target: 'form', retryable: true };
    case 'rate_limited':
      return { message: 'Too many attempts. Please wait a minute and try again.', target: 'form', retryable: false };
    case 'forbidden':
      return { message: 'This account has been disabled. Contact support for help.', target: 'form', retryable: false };
    case 'server':
      return GENERIC;
    default:
      break;
  }

  switch (action) {
    case 'login-password':
      // Backend returns the same 401 for unknown number and wrong password, so the copy covers both.
      return err.kind === 'unauthorized'
        ? { message: 'Incorrect mobile number or password.', target: 'password', retryable: false }
        : GENERIC;
    case 'login-otp-send':
      return err.kind === 'not_found'
        ? { message: 'No account found for this number. Sign up to get started.', target: 'mobile', retryable: false }
        : GENERIC;
    case 'forgot-otp-send':
      return err.kind === 'not_found'
        ? { message: 'No account found for this number.', target: 'mobile', retryable: false }
        : GENERIC;
    case 'password-reset':
      if (err.kind === 'unauthorized') {
        return { message: 'Your reset session expired. Start again from Forgot password.', target: 'form', retryable: false };
      }
      return err.kind === 'conflict'
        ? { message: 'Choose a password you have not used recently.', target: 'password', retryable: false }
        : GENERIC;
    case 'signup-otp-send':
      return err.kind === 'validation'
        ? { message: 'Enter a valid 10-digit mobile number.', target: 'mobile', retryable: false }
        : GENERIC;
    case 'otp-verify':
      return err.kind === 'unauthorized'
        ? { message: 'That code is incorrect or has expired.', target: 'otp', retryable: false }
        : GENERIC;
    case 'signup-complete':
      if (err.kind === 'unauthorized') {
        return { message: 'Your session expired. Go back and verify your number again.', target: 'form', retryable: false };
      }
      if (err.kind === 'conflict') {
        return { message: 'An account with this number already exists. Try logging in.', target: 'form', retryable: false };
      }
      return err.kind === 'validation'
        ? { message: 'Please check your details and try again.', target: 'form', retryable: false }
        : GENERIC;
  }
};
