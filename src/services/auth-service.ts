import { apiPost } from '@/lib/api-client';
import type { Role } from '@/constants/roles';
import type { LoginResponse, SendOtpResponse, SignupVerifyOtpResponse } from '@/types/auth';

/** Mirrors ruxstar-backend-services/routes/auth.routes.js exactly — no endpoints invented. */
export const AuthService = {
  signupSendOtp: (mobile: string) => apiPost<SendOtpResponse>('/auth/signup/send-otp', { mobile }),

  signupVerifyOtp: (mobile: string, otp: string) =>
    apiPost<SignupVerifyOtpResponse>('/auth/signup/verify-otp', { mobile, otp }),

  signupComplete: (signupToken: string, name: string, password: string, role: Role) =>
    apiPost<LoginResponse>('/auth/signup/complete', { signupToken, name, password, role }),

  loginSendOtp: (mobile: string) => apiPost<SendOtpResponse>('/auth/login/send-otp', { mobile }),

  loginVerifyOtp: (mobile: string, otp: string) =>
    apiPost<LoginResponse>('/auth/login/verify-otp', { mobile, otp }),

  loginWithPassword: (mobile: string, password: string) =>
    apiPost<LoginResponse>('/auth/login', { mobile, password }),

  logout: (token: string) => apiPost<{ message: string }>('/auth/logout', undefined, token),
};
