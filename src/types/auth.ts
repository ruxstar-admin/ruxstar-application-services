import type { Role } from '@/constants/roles';

export interface AuthUser {
  _id: string;
  refId: string;
  name: string;
  mobile: string;
  roles: Role[];
  status?: 'active' | 'disabled';
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface SendOtpResponse {
  message: string;
  otp?: string; // present only in non-production backend environments
}

export interface SignupVerifyOtpResponse {
  signupToken: string;
}
