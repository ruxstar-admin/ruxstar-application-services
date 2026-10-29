import { ApiError } from '@/lib/api-error';

/** Where an error should be shown: under a specific field, or as a banner for the whole form. */
export type AuthErrorTarget = 'mobile' | 'password' | 'otp' | 'name' | 'username' | 'email' | 'dob' | 'form';

export interface AuthError {
  message: string;
  target: AuthErrorTarget;
  /** True for failures worth retrying as-is (offline, timeout, server). */
  retryable: boolean;
}

export type AuthAction =
  | 'login-password'
  | 'login-otp-send'
  | 'login-code'
  | 'signup-otp-send'
  | 'forgot-otp-send'
  | 'otp-verify'
  | 'signup-complete'
  | 'password-reset';

const GENERIC: AuthError = { message: 'Something went wrong. Please try again.', target: 'form', retryable: true };

/** The API's field names (`body/phone`) mapped to the screens' fields. */
const FIELD_TARGET: Record<string, AuthErrorTarget> = {
  phone: 'mobile',
  password: 'password',
  code: 'otp',
  name: 'name',
  username: 'username',
  email: 'email',
  dob: 'dob',
};

/** Shown when the API's detail is a schema message ("must match format…") rather than written copy. */
const FIELD_COPY: Record<AuthErrorTarget, string> = {
  mobile: 'Enter a valid 10-digit mobile number.',
  password: 'Use 8 to 64 characters with a letter and a number.',
  otp: 'Enter the 6-digit code.',
  name: 'Enter your full name.',
  username: 'Use 3–20 letters, numbers, "." or "_".',
  email: 'Enter a valid email address.',
  dob: 'You need to be at least 13 years old.',
  form: 'Please check your details and try again.',
};

/** "45 seconds", "5 minutes"; the API sends the real wait in `retryAfterSeconds`. */
export const waitCopy = (seconds?: number) => {
  if (!seconds || seconds <= 0) return 'a few minutes';
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
};

const validation = (err: ApiError): AuthError => {
  const detail = err.details.find((d) => d.path && FIELD_TARGET[d.path.split('/').pop() ?? '']);
  const target = detail?.path ? FIELD_TARGET[detail.path.split('/').pop()!] : 'form';
  const written = detail?.message && !/^must /.test(detail.message) && !detail.message.startsWith('Unknown field');
  return { message: written ? detail!.message : FIELD_COPY[target], target, retryable: false };
};

const isCodeStep = (action: AuthAction) => action === 'otp-verify' || action === 'login-code';

/** Single place that turns any thrown value into friendly copy — screens never read `err.message`. */
export const toAuthError = (err: unknown, action: AuthAction): AuthError => {
  if (!(err instanceof ApiError)) return GENERIC;

  if (err.kind === 'network') {
    return { message: 'No internet connection. Check your network and try again.', target: 'form', retryable: true };
  }
  if (err.kind === 'timeout') {
    return { message: 'This is taking longer than usual. Please try again.', target: 'form', retryable: true };
  }

  switch (err.code) {
    case 'VALIDATION_FAILED':
      return validation(err);
    case 'INVALID_CREDENTIALS':
      // Same answer for an unknown number and a wrong password, so the copy covers both.
      return { message: 'Incorrect mobile number or password.', target: 'password', retryable: false };
    case 'ACCOUNT_LOCKED':
      return {
        message: `Too many wrong passwords. Try again in ${waitCopy(err.retryAfterSeconds)}, or sign in with a code.`,
        target: 'form',
        retryable: false,
      };
    case 'OTP_INVALID': {
      const left = err.detailFor('code')?.attemptsLeft;
      const tries = typeof left === 'number' ? ` ${left} ${left === 1 ? 'try' : 'tries'} left.` : '';
      return { message: `That code is not right.${tries}`, target: 'otp', retryable: false };
    }
    case 'OTP_EXPIRED':
      return { message: 'That code has expired. Tap SMS to get a new one.', target: 'otp', retryable: false };
    case 'OTP_LIMIT':
      return {
        message: `Too many codes or tries. Try again in ${waitCopy(err.retryAfterSeconds)}.`,
        target: isCodeStep(action) ? 'otp' : 'form',
        retryable: false,
      };
    case 'VERIFICATION_INVALID':
      return action === 'password-reset'
        ? { message: 'Your reset session expired. Start again from Forgot password.', target: 'form', retryable: false }
        : { message: 'Your session expired. Go back and verify your number again.', target: 'form', retryable: false };
    case 'PHONE_TAKEN':
      return { message: 'An account with this number already exists. Try logging in.', target: action === 'signup-otp-send' ? 'mobile' : 'form', retryable: false };
    case 'USERNAME_TAKEN':
      return {
        message: err.detailFor('username')?.message === 'Reserved' ? 'That username is reserved. Try another.' : 'That username is taken. Try another.',
        target: 'username',
        retryable: false,
      };
    case 'EMAIL_TAKEN':
      return { message: 'This email is on another account.', target: 'email', retryable: false };
    case 'PASSWORD_REUSED':
      return { message: 'Choose a password you have not used recently.', target: 'password', retryable: false };
    case 'NOT_FOUND':
      return action === 'forgot-otp-send'
        ? { message: 'No account found for this number.', target: 'mobile', retryable: false }
        : { message: 'No account found for this number. Sign up to get started.', target: 'mobile', retryable: false };
    case 'FORBIDDEN':
      return { message: 'This account is on hold. Contact support for help.', target: 'form', retryable: false };
    case 'UPGRADE_REQUIRED':
      return { message: 'Update Ruxstar from the store to keep going.', target: 'form', retryable: false };
    case 'SMS_UNAVAILABLE':
      return { message: 'We cannot send codes right now. Try again shortly.', target: 'form', retryable: true };
    case 'NOT_READY':
      return { message: 'Ruxstar is starting up. Try again in a few seconds.', target: 'form', retryable: true };
    default:
      break;
  }

  if (err.kind === 'rate_limited') {
    return { message: 'Too many attempts. Please wait a minute and try again.', target: 'form', retryable: false };
  }
  return GENERIC;
};
