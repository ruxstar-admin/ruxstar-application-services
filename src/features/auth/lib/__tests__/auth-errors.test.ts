import { ApiError } from '@/lib/api-error';
import { toAuthError } from '../auth-errors';

describe('toAuthError', () => {
  it('maps a wrong password to the password field without leaking server text', () => {
    const result = toAuthError(new ApiError(401, 'invalid credentials'), 'login-password');
    expect(result).toMatchObject({ target: 'password', retryable: false });
    expect(result.message).toBe('Incorrect mobile number or password.');
  });

  it('maps a bad OTP to the otp field', () => {
    const result = toAuthError(new ApiError(401, 'invalid or expired OTP'), 'otp-verify');
    expect(result.target).toBe('otp');
  });

  it('points an unknown login number at the mobile field', () => {
    expect(toAuthError(new ApiError(404, 'user not found'), 'login-otp-send').target).toBe('mobile');
  });

  it('treats offline and timeouts as retryable form errors', () => {
    expect(toAuthError(ApiError.network(), 'login-password')).toMatchObject({ target: 'form', retryable: true });
    expect(toAuthError(ApiError.timeout(), 'otp-verify')).toMatchObject({ target: 'form', retryable: true });
  });

  it('never exposes raw 5xx text', () => {
    const result = toAuthError(new ApiError(500, 'E11000 duplicate key collection users'), 'signup-complete');
    expect(result.message).not.toMatch(/E11000/);
    expect(result.retryable).toBe(true);
  });

  it('is not retryable when rate limited or disabled', () => {
    expect(toAuthError(new ApiError(429, 'slow down'), 'login-password').retryable).toBe(false);
    expect(toAuthError(new ApiError(403, 'disabled'), 'login-password').retryable).toBe(false);
  });

  it('falls back to a generic message for non-API errors', () => {
    expect(toAuthError(new TypeError('boom'), 'login-password').target).toBe('form');
  });
});
