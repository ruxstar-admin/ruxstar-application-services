/** Aadhaar numbers are 12 digits and never start with 0 or 1. */
const AADHAAR_PATTERN = /^[2-9]\d{11}$/;
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_PATTERN = /^\d{9,18}$/;
const GST_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
/** Shop / trade licences have no national format; accept a plausible alphanumeric id. */
const LICENCE_PATTERN = /^[A-Z0-9][A-Z0-9/\-]{5,24}$/;
const DRIVING_LICENCE_PATTERN = /^[A-Z]{2}\d{2}\d{4}\d{7}$/;

export const digitsOnly = (value: string, max: number) => value.replace(/\D/g, '').slice(0, max);
export const upperAlnum = (value: string, max: number) => value.toUpperCase().replace(/[^A-Z0-9/-]/g, '').slice(0, max);

export const isValidAadhaar = (value: string) => AADHAAR_PATTERN.test(value);
export const isValidIfsc = (value: string) => IFSC_PATTERN.test(value);
export const isValidAccountNumber = (value: string) => ACCOUNT_PATTERN.test(value);
export const isValidBusinessId = (value: string) => GST_PATTERN.test(value) || LICENCE_PATTERN.test(value);
export const isValidDrivingLicence = (value: string) => DRIVING_LICENCE_PATTERN.test(value.replace(/[-\s]/g, ''));

/** Formats a 12-digit Aadhaar as `1234 5678 9012`. */
export const formatAadhaar = (value: string) => value.replace(/(\d{4})(?=\d)/g, '$1 ');

/** `ending 5678` — what the review screen shows instead of a full sensitive number. */
export const endingIn = (value: string) => `ending ${value.slice(-4)}`;
