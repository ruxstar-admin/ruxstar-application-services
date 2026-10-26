export type Gender = 'male' | 'female' | 'other';
export type ProfileBadge = 'user' | 'vendor' | 'trainer' | 'delivery';

/** Profile fields served by the API. Name and mobile come from the signed-in account (auth store). */
export interface Profile {
  id: string;
  name: string;
  username: string;
  bio: string;
  link: string;
  avatarUrl?: string;
  posts: number;
  engagements: number;
  /** null until the user has a rated engagement. */
  rating: number | null;
  memberSince: string;
  badges: ProfileBadge[];
  email: string;
  gender?: Gender;
}

export type ProfileUpdate = Partial<Pick<Profile, 'name' | 'username' | 'bio' | 'link' | 'email' | 'gender' | 'avatarUrl'>>;

export interface Session {
  id: string;
  device: string;
  location: string;
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
