export interface Page<T> {
  items: T[];
  /** Pass back to load the next page; null when there are no more. */
  nextCursor: string | null;
}

export interface Author {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  /** Shows the "Store" tag next to the name. */
  isVendor: boolean;
  /** Identity verified by Ruxstar: the tick next to the name. */
  verified: boolean;
}

/** Business posts come from the vendor portal and show on the Business tab. */
export type PostKind = 'personal' | 'business';

/** Width and height let the card keep the photo's space before it loads. */
export interface PostPhoto {
  url: string;
  width: number;
  height: number;
}

export interface Post {
  id: string;
  author: Author;
  kind: PostKind;
  text: string;
  photos: PostPhoto[];
  createdAt: string;
  editedAt: string | null;
  likes: number;
  comments: number;
  likedByMe: boolean;
  savedByMe: boolean;
  mine: boolean;
}

export interface Comment {
  id: string;
  author: Author;
  text: string;
  createdAt: string;
  mine: boolean;
}

export type NotificationKind = 'employment' | 'order' | 'class' | 'social' | 'account';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  /** True for offers that still need Accept / Decline. */
  actionable: boolean;
  /** Where tapping it goes. */
  postId?: string;
  /** A verification decision: tapping opens the Verification screen. */
  verification?: boolean;
}

export const SEARCH_SCOPES = [
  { key: 'people', label: 'People' },
  { key: 'businesses', label: 'Businesses' },
  { key: 'events', label: 'Events' },
  { key: 'courses', label: 'Courses' },
  { key: 'stays', label: 'Stays' },
] as const;

export type SearchScope = (typeof SEARCH_SCOPES)[number]['key'];

export interface SearchResult {
  id: string;
  scope: SearchScope;
  title: string;
  subtitle: string;
  /** People only: shown in place of the scope icon. */
  avatarUrl?: string;
}
