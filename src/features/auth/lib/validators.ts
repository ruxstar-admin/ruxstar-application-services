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

const USERNAME_PATTERN = /^[a-z0-9_.]{3,20}$/;

/** Usernames are lowercase; spaces and other characters are dropped as the user types. */
export const normalizeUsername = (value: string) => value.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 20);

export const isValidUsername = (username: string) => USERNAME_PATTERN.test(username);

export const usernameError = (username: string): string | null =>
  username.length > 0 && !isValidUsername(username) ? 'Use 3–20 letters, numbers, "." or "_".' : null;

export const isPasswordPairValid = (password: string, confirmation: string) =>
  password.length >= MIN_PASSWORD_LENGTH && password === confirmation;

/** Empty is allowed (email is optional); otherwise a basic address shape. */
export const isValidEmail = (email: string) => email.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
