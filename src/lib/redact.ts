/**
 * Keys whose values must never leave the device, even inside logs, breadcrumbs or request bodies.
 * Short identity words (pan, ifsc, email, aadhaar) are matched whole so keys like `spans` or
 * `company` are left alone.
 */
const SENSITIVE_KEY =
  /pass(word)?|otp|token|authorization|mobile|phone|^(aadhaar|pan|ifsc|email)$|(aadhaar|pan|account|licen[cs]e).?(number|no)$/i;

export const redact = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [key, SENSITIVE_KEY.test(key) ? '[redacted]' : redact(v)]),
    );
  }
  return value;
};
