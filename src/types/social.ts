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
}

export interface Post {
  id: string;
  author: Author;
  text: string;
  images: string[];
  createdAt: string;
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
}

export type NotificationKind = 'employment' | 'order' | 'class' | 'social';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  /** True for offers that still need Accept / Decline. */
  actionable: boolean;
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
}
