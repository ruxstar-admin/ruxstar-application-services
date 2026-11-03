export type Gender = 'male' | 'female' | 'other';
export type ProfileBadge = 'user' | 'vendor' | 'trainer' | 'delivery';

/** Profile fields served by the API. Name and mobile come from the signed-in account (auth store). */
export interface Profile {
  id: string;
  name: string;
  username: string;
  bio: string;
  avatarUrl?: string;
  posts: number;
  engagements: number;
  /** null until the user has a rated engagement. */
  rating: number | null;
  memberSince: string;
  badges: ProfileBadge[];
  email: string;
  emailVerified: boolean;
  gender?: Gender;
  /** Empty when not set. Shown on the profile. */
  city: string;
}

/** The API's `PublicProfile` (GET /v1/account/profiles/{ref}). Never phone, email, date of birth or gender. */
export interface PublicProfileResponse {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  badges: { vendor: boolean; delivery: boolean };
  stats: { posts: number; engagements: number };
  memberSince: string;
}

/** The photo has its own calls (ProfileService.setPhoto / removePhoto). */
export type ProfileUpdate = Partial<Pick<Profile, 'name' | 'username' | 'bio' | 'email' | 'gender' | 'city'>>;

export interface Session {
  id: string;
  device: string;
  lastActive: string;
  current: boolean;
}

export interface NotificationPrefs {
  orders: boolean;
  messages: boolean;
  social: boolean;
  work: boolean;
  digest: boolean;
}

export interface BlockedUser {
  id: string;
  name: string;
  username: string;
}

export const REPORT_REASONS = [
  { key: 'spam', label: 'Spam or scam' },
  { key: 'fake', label: 'Fake store or listing' },
  { key: 'abuse', label: 'Rude or abusive behaviour' },
  { key: 'undelivered', label: 'Never delivered my order' },
  { key: 'other', label: 'Something else' },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['key'];
