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
  /** Narrower copies of the same photo, for small tiles. */
  smaller?: { url: string; width: number; height: number }[];
}

/** The business a business post is for. `orderable` when it is a live print shop taking orders. */
export interface PostBusiness {
  id: string;
  name: string;
  module: string;
  orderable: boolean;
}

export type FeedTab = 'for_you' | 'following';

export interface Post {
  id: string;
  author: Author;
  kind: PostKind;
  business: PostBusiness | null;
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

/** Someone in a followers, following or blocked list. */
export interface Person extends Author {
  followedByMe: boolean;
  /** The signed-in user, who has no Follow button. */
  me: boolean;
}

/** You and someone else. */
export interface Relation {
  following: boolean;
  followsMe: boolean;
  blockedByMe: boolean;
  counts: { followers: number; following: number };
}

export const USER_REPORT_REASONS = [
  { key: 'spam', label: 'Spam' },
  { key: 'fake', label: 'Fake account or pretending to be someone' },
  { key: 'abuse', label: 'Rude or abusive behaviour' },
  { key: 'scam', label: 'Scam or asking for money' },
  { key: 'other', label: 'Something else' },
] as const;

export type UserReportReason = (typeof USER_REPORT_REASONS)[number]['key'];

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
  /** Where tapping it goes. */
  postId?: string;
  /** A verification decision: tapping opens the Verification screen. */
  verification?: boolean;
  /** A hold on one of your businesses, or its lifting: tapping opens it in the vendor portal. */
  businessId?: string;
  /** News about your print order: tapping opens it. */
  orderId?: string;
  /** A new or cancelled order to your shop: tapping opens it in the vendor portal. */
  shopOrderId?: string;
  /** A new follower: tapping opens their profile. */
  profileId?: string;
  /** A withdrawal arrived or failed: tapping opens Payments in the vendor portal. */
  payments?: boolean;
}
