import type { UserRole } from '@/stores/auth-store';

const BASE_URL = 'https://ruxstar-backend-services-391710984982.us-central1.run.app';

// ─── HTTP helper — matches website's api.ts ──────────────────────────────────

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res  = await fetch(`${BASE_URL}/auth/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 409) throw new Error("That number's already registered — log in instead.");
    if (res.status === 404) throw new Error('No account found — sign up first.');
    throw new Error(data.message ?? data.error ?? `Request failed (${res.status})`);
  }

  return data as T;
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface AuthUser {
  id?:    string;
  _id?:   string;
  name?:  string;
  role?:  string;
  roles?: string[];
  mobile?: string;
}

export interface AuthResponse {
  token: string;
  user:  AuthUser;
}

export interface OtpSentResponse {
  otp?: string; // dev only — server returns plaintext OTP for testing
}

export interface SignupVerifyResponse {
  signupToken: string;
  otp?:        string; // dev only
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

export const AuthService = {
  // ── Login ──────────────────────────────────────────────────────────────────

  /** Password login */
  loginPassword(mobile: string, password: string) {
    return post<AuthResponse>('login', { mobile, password });
  },

  /** OTP login — step 1: send */
  loginSendOtp(mobile: string) {
    return post<OtpSentResponse>('login/send-otp', { mobile });
  },

  /** OTP login — step 2: verify */
  loginVerifyOtp(mobile: string, otp: string) {
    return post<AuthResponse>('login/verify-otp', { mobile, otp });
  },

  // ── Signup ─────────────────────────────────────────────────────────────────

  /** Signup — step 1: send OTP */
  signupSendOtp(mobile: string) {
    return post<OtpSentResponse>('signup/send-otp', { mobile });
  },

  /** Signup — step 2: verify OTP → get signupToken */
  signupVerifyOtp(mobile: string, otp: string) {
    return post<SignupVerifyResponse>('signup/verify-otp', { mobile, otp });
  },

  /** Signup — step 3: complete with name, role, password */
  signupComplete(signupToken: string, name: string, password: string, role: UserRole) {
    return post<AuthResponse>('signup/complete', { signupToken, name, password, role });
  },

  // ── Session ────────────────────────────────────────────────────────────────

  logout(token: string) {
    return post<void>('logout', {}, token);
  },
};

// ─── Helper — extract role from user object ───────────────────────────────────

export function resolveRole(user: AuthUser): UserRole {
  const r = (user.role ?? user.roles?.[0] ?? 'customer').toLowerCase();
  if (r === 'vendor' || r === 'business') return 'vendor';
  if (r === 'delivery')                   return 'delivery';
  return 'customer';
}
