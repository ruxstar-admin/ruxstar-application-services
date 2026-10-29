import { ApiError } from '@/lib/api-error';
import { toAuthError, waitCopy } from '../auth-errors';

const api = (status: number, code: string, details: ApiError['details'] = []) => new ApiError(status, 'server text', undefined, code, details);

describe('toAuthError', () => {
  it('maps a wrong password to the password field without leaking server text', () => {
    const result = toAuthError(api(401, 'INVALID_CREDENTIALS'), 'login-password');
    expect(result).toMatchObject({ target: 'password', retryable: false });
    expect(result.message).toBe('Incorrect mobile number or password.');
  });

  it('shows the tries left on a wrong code', () => {
    const result = toAuthError(api(422, 'OTP_INVALID', [{ path: 'body/code', message: '2 tries left.', attemptsLeft: 2 }]), 'otp-verify');
    expect(result).toMatchObject({ target: 'otp', message: 'That code is not right. 2 tries left.' });
  });

  it('takes lock times from the API, never a fixed number', () => {
    const locked = toAuthError(api(423, 'ACCOUNT_LOCKED', [{ message: 'x', retryAfterSeconds: 900 }]), 'login-password');
    expect(locked.message).toMatch(/15 minutes/);
    const codes = toAuthError(api(429, 'OTP_LIMIT', [{ message: 'x', retryAfterSeconds: 300 }]), 'login-code');
    expect(codes).toMatchObject({ target: 'otp', retryable: false });
    expect(codes.message).toMatch(/5 minutes/);
  });

  it('points an unknown number at the mobile field', () => {
    expect(toAuthError(api(404, 'NOT_FOUND'), 'login-otp-send').target).toBe('mobile');
    expect(toAuthError(api(404, 'NOT_FOUND'), 'forgot-otp-send').target).toBe('mobile');
  });

  it('puts signup clashes under their own fields', () => {
    expect(toAuthError(api(409, 'USERNAME_TAKEN'), 'signup-complete').target).toBe('username');
    expect(toAuthError(api(409, 'EMAIL_TAKEN'), 'signup-complete').target).toBe('email');
    expect(toAuthError(api(422, 'VERIFICATION_INVALID'), 'signup-complete').target).toBe('form');
  });

  it('keeps written validation copy and replaces schema messages', () => {
    const written = toAuthError(api(400, 'VALIDATION_FAILED', [{ path: 'body/dob', message: 'You need to be at least 13 years old.' }]), 'signup-complete');
    expect(written).toMatchObject({ target: 'dob', message: 'You need to be at least 13 years old.' });
    const schema = toAuthError(api(400, 'VALIDATION_FAILED', [{ path: 'body/email', message: 'must match format "email"' }]), 'signup-complete');
    expect(schema).toMatchObject({ target: 'email', message: 'Enter a valid email address.' });
  });

  it('treats offline, timeouts, startup and SMS outages as retryable form errors', () => {
    expect(toAuthError(ApiError.network(), 'login-password')).toMatchObject({ target: 'form', retryable: true });
    expect(toAuthError(ApiError.timeout(), 'otp-verify')).toMatchObject({ target: 'form', retryable: true });
    expect(toAuthError(api(503, 'NOT_READY'), 'login-password').retryable).toBe(true);
    expect(toAuthError(api(503, 'SMS_UNAVAILABLE'), 'signup-otp-send').retryable).toBe(true);
  });

  it('never exposes raw 5xx text', () => {
    const result = toAuthError(new ApiError(500, 'E11000 duplicate key collection users', undefined, 'INTERNAL'), 'signup-complete');
    expect(result.message).not.toMatch(/E11000/);
    expect(result.retryable).toBe(true);
  });

  it('is not retryable when rate limited or on hold', () => {
    expect(toAuthError(api(429, 'RATE_LIMITED'), 'login-password').retryable).toBe(false);
    expect(toAuthError(api(403, 'FORBIDDEN'), 'login-password').retryable).toBe(false);
  });

  it('falls back to a generic message for non-API errors', () => {
    expect(toAuthError(new TypeError('boom'), 'login-password').target).toBe('form');
  });

  it('maps password reset failures', () => {
    expect(toAuthError(api(422, 'PASSWORD_REUSED'), 'password-reset')).toMatchObject({ target: 'password', retryable: false });
    expect(toAuthError(api(422, 'VERIFICATION_INVALID'), 'password-reset').message).toMatch(/Forgot password/);
  });
});

describe('waitCopy', () => {
  it('reads seconds and minutes', () => {
    expect(waitCopy(45)).toBe('45 seconds');
    expect(waitCopy(60)).toBe('1 minute');
    expect(waitCopy(299)).toBe('5 minutes');
    expect(waitCopy(undefined)).toBe('a few minutes');
  });
});
