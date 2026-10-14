/** Indian mobile numbers are 10 digits starting with 6–9. */
const MOBILE_PATTERN = /^[6-9]\d{9}$/;

export const MIN_PASSWORD_LENGTH = 6;
export const OTP_LENGTH = 6;

export const isValidMobile = (mobile: string) => MOBILE_PATTERN.test(mobile);

/** Returns an error message once the user has typed something wrong; null while incomplete or valid. */
export const mobileError = (mobile: string): string | null => {
  if (mobile.length === 0) return null;
  if (!/^[6-9]/.test(mobile)) return 'Mobile numbers start with 6, 7, 8 or 9.';
  if (mobile.length < 10) return 'Enter all 10 digits of your mobile number.';
  return null;
};

export const passwordError = (password: string): string | null =>
  password.length > 0 && password.length < MIN_PASSWORD_LENGTH
    ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    : null;
