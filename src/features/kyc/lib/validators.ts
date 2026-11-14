/** Aadhaar numbers are 12 digits and never start with 0 or 1. */
const AADHAAR_PATTERN = /^[2-9]\d{11}$/;
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_PATTERN = /^\d{9,18}$/;
const GST_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
/** Shop / trade licences have no national format; accept a plausible alphanumeric id. */
const LICENCE_PATTERN = /^[A-Z0-9][A-Z0-9/\-]{5,24}$/;
/** The API's patterns: the state, the RTO, then the year and serial; plates like TS09AB1234 or the BH series. */
const DRIVING_LICENCE_PATTERN = /^[A-Z]{2}\d{2}[0-9A-Z]{11,12}$/;
const PLATE_PATTERN = /^([A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}|\d{2}BH\d{4}[A-Z]{1,2})$/;

export const digitsOnly = (value: string, max: number) => value.replace(/\D/g, '').slice(0, max);
export const upperAlnum = (value: string, max: number) => value.toUpperCase().replace(/[^A-Z0-9/-]/g, '').slice(0, max);

export const isValidAadhaar = (value: string) => AADHAAR_PATTERN.test(value);
export const isValidIfsc = (value: string) => IFSC_PATTERN.test(value);
export const isValidAccountNumber = (value: string) => ACCOUNT_PATTERN.test(value);
export const isValidBusinessId = (value: string) => GST_PATTERN.test(value) || LICENCE_PATTERN.test(value);
/** Upper case without spaces, dashes, dots or slashes, as the API stores licence and plate numbers. */
export const tidyNumber = (value: string) => value.toUpperCase().replace(/[\s\-./]/g, '');
export const isValidDrivingLicence = (value: string) => DRIVING_LICENCE_PATTERN.test(tidyNumber(value));
export const isValidPlate = (value: string) => PLATE_PATTERN.test(tidyNumber(value));

/** Formats a 12-digit Aadhaar as `1234 5678 9012`. */
export const formatAadhaar = (value: string) => value.replace(/(\d{4})(?=\d)/g, '$1 ');

/** `ending 5678` — what the review screen shows instead of a full sensitive number. */
export const endingIn = (value: string) => `ending ${value.slice(-4)}`;
