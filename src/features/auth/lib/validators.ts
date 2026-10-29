/** Indian mobile numbers are 10 digits starting with 6–9. */
const MOBILE_PATTERN = /^[6-9]\d{9}$/;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 64;
export const OTP_LENGTH = 6;
export const MIN_AGE_YEARS = 13;

export const isValidMobile = (mobile: string) => MOBILE_PATTERN.test(mobile);

/** Returns an error message once the user has typed something wrong; null while incomplete or valid. */
export const mobileError = (mobile: string): string | null => {
  if (mobile.length === 0) return null;
  if (!/^[6-9]/.test(mobile)) return 'Mobile numbers start with 6, 7, 8 or 9.';
  if (mobile.length < 10) return 'Enter all 10 digits of your mobile number.';
  return null;
};

/** Same rules as the API's signup and reset. `mobile` is the 10-digit number, when known. */
export const passwordError = (password: string, mobile?: string): string | null => {
  if (password.length === 0) return null;
  if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password.length > MAX_PASSWORD_LENGTH) return `Password can be at most ${MAX_PASSWORD_LENGTH} characters.`;
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Use at least one letter and one number.';
  if (mobile && password.includes(mobile)) return 'Do not use your phone number in your password.';
  return null;
};

/** The API refuses names without a letter or with a long run of digits (a pasted phone number). */
export const nameError = (name: string): string | null => {
  const trimmed = name.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length < 2) return 'Enter your full name.';
  if (!/\p{L}/u.test(trimmed) || /\d{6,}/.test(trimmed)) return 'Enter your name, not a number.';
  return null;
};

export const isValidName = (name: string) => name.trim().length >= 2 && nameError(name) === null;

/** Formats typed digits as `DD/MM/YYYY`. */
export const formatDobInput = (text: string) => {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
};

/** `DD/MM/YYYY` to `YYYY-MM-DD`, or null for an incomplete or impossible date (31/02). */
export const dobToIso = (display: string): string | null => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.getUTCDate() !== Number(dd) || date.getUTCMonth() + 1 !== Number(mm)) return null;
  return `${yyyy}-${mm}-${dd}`;
};

export const dobError = (display: string, now: Date = new Date()): string | null => {
  if (display.length < 10) return null;
  const iso = dobToIso(display);
  if (!iso) return 'Enter a real date as DD/MM/YYYY.';
  return isOldEnough(iso, now) ? null : `You need to be at least ${MIN_AGE_YEARS} years old.`;
};

/** True when a `YYYY-MM-DD` date of birth is at least 13 years ago (and after 1900). */
export const isOldEnough = (dob: string, now: Date = new Date()) => {
  const born = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(born.getTime()) || born.getUTCFullYear() < 1900) return false;
  const latest = new Date(Date.UTC(now.getUTCFullYear() - MIN_AGE_YEARS, now.getUTCMonth(), now.getUTCDate()));
  return born <= latest;
};

const USERNAME_PATTERN = /^[a-z0-9_.]{3,20}$/;

/** Usernames are lowercase; spaces and other characters are dropped as the user types. */
export const normalizeUsername = (value: string) => value.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 20);

export const isValidUsername = (username: string) => USERNAME_PATTERN.test(username);

export const usernameError = (username: string): string | null =>
  username.length > 0 && !isValidUsername(username) ? 'Use 3–20 letters, numbers, "." or "_".' : null;

export const isPasswordPairValid = (password: string, confirmation: string, mobile?: string) =>
  password.length > 0 && passwordError(password, mobile) === null && password === confirmation;

/** Empty is allowed (email is optional); otherwise a basic address shape. */
export const isValidEmail = (email: string) => email.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
