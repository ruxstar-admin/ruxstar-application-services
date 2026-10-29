import type { RoleFlags } from '@/constants/roles';
import type { Gender } from '@/types/profile';

/** The API's `User` (GET /v1/account/me). */
export interface AuthUser {
  id: string;
  /** E.164, for example +919876543210. */
  phone: string;
  name: string;
  username: string;
  email: string | null;
  bio: string | null;
  link: string | null;
  /** YYYY-MM-DD. */
  dob: string | null;
  gender: Gender | null;
  city: string | null;
  roles: RoleFlags;
  kyc: { base: string };
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  /** Seconds. */
  accessTokenExpiresIn: number;
  /** Single use: every refresh returns a new one. */
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

/** Signup, password sign-in and code sign-in all return this. The app always gets `tokens`. */
export interface SignedIn {
  user: AuthUser;
  tokens: AuthTokens;
}

export type OtpPurpose = 'signup' | 'login' | 'reset';

export interface OtpSent {
  /** Masked, for example +91 ••••• •3210. */
  sentTo: string;
  expiresInSeconds: number;
  resendInSeconds: number;
}

export interface Verified {
  /** Pass to signup or password reset. Works once. */
  verificationToken: string;
  expiresInSeconds: number;
}

export interface SignupDetails {
  verificationToken: string;
  name: string;
  password: string;
  username: string;
  dob: string;
  gender: Gender;
  email?: string;
}

export interface UsernameCheckResponse {
  /** null when nothing was checked. */
  available: boolean | null;
  /** Free handles from the name, best first. */
  suggestions: string[];
}
