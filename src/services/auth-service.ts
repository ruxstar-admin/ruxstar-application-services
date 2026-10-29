import { apiPost } from '@/lib/api-client';
import { deviceInfo } from '@/lib/device';
import type { OtpPurpose, OtpSent, SignedIn, SignupDetails, Verified } from '@/types/auth';

const ACCOUNT = '/v1/account';
type Done = { done: true };

/** `/v1/account` in ruxstar-backend-services (src/modules/account). Numbers are 10 digits, without +91. */
export const AuthService = {
  /** Signup needs a new number; login and reset need one with an account (404 otherwise). */
  sendOtp: (mobile: string, purpose: OtpPurpose) => apiPost<OtpSent>(`${ACCOUNT}/otp`, { phone: mobile, purpose }),

  /** For signup and reset. Code sign-in uses `loginWithCode` instead. */
  verifyOtp: (mobile: string, purpose: Exclude<OtpPurpose, 'login'>, code: string) =>
    apiPost<Verified>(`${ACCOUNT}/otp/verify`, { phone: mobile, purpose, code }),

  signup: async (details: SignupDetails) =>
    apiPost<SignedIn>(`${ACCOUNT}/signup`, { ...details, acceptTerms: true, ...(await deviceInfo()) }),

  loginWithPassword: async (mobile: string, password: string) =>
    apiPost<SignedIn>(`${ACCOUNT}/login`, { phone: mobile, password, ...(await deviceInfo()) }),

  loginWithCode: async (mobile: string, code: string) =>
    apiPost<SignedIn>(`${ACCOUNT}/login/code`, { phone: mobile, code, ...(await deviceInfo()) }),

  /** Signs out every device. */
  resetPassword: (verificationToken: string, password: string) =>
    apiPost<Done>(`${ACCOUNT}/password/reset`, { verificationToken, password }),

  /** The refresh token lets the API end the session even when the access token has expired. */
  logout: (token: string, refreshToken: string | null) =>
    apiPost<Done>(`${ACCOUNT}/logout`, refreshToken ? { refreshToken } : {}, token),
};
