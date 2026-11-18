import type { AppliedCoupon } from './coupon';
import type { InvoiceRef } from './invoice';
import type { Rating } from './review';

/** Basic, Standard and Premium, in that order: a gig with two packages has basic and standard. */
export type GigTier = 'basic' | 'standard' | 'premium';
export type GigStatus = 'draft' | 'live' | 'paused' | 'removed';
/**
 * `paid` waits for the freelancer to accept. `in_progress` is being worked on (again, after a revision).
 * `delivered` waits for the customer. `disputed`: Ruxstar decides. `completed`: the freelancer is paid.
 */
export type GigOrderStatus = 'awaiting_payment' | 'paid' | 'in_progress' | 'delivered' | 'disputed' | 'completed' | 'cancelled';
export type QuoteStatus = 'open' | 'withdrawn' | 'expired' | 'paid';
export type FileUse = 'brief' | 'delivery';

export interface GigCategoryOption {
  key: string;
  label: string;
}

/** GET /v1/gigs/rules. Money in paise. */
export interface GigsRules {
  /** The ones showing, in order. */
  categories: GigCategoryOption[];
  autoCompleteDays: number;
  acceptHours: number;
  quoteDays: number;
  /** Files in one delivery, or attached to an order, add up to at most this. */
  deliveryMaxMb: number;
  fileDays: number;
  maxGigs: number;
  maxPackages: number;
  minPrice: number;
  maxPrice: number;
  minDays: number;
  maxDays: number;
  maxRevisions: number;
  commissionBps: number;
  platformFee: number;
  live: boolean;
  signupsOpen: boolean;
  /** Set by Ruxstar in the console. Older APIs leave it out. */
  limits?: GigsLimits;
}

/** How many portfolio items, gig photos, questions, files and links; an answer's length; the file types taken. */
export interface GigsLimits {
  portfolio: number;
  gigPhotos: number;
  questions: number;
  files: number;
  links: number;
  answer: number;
  extensions: string[];
}

export interface GigPhoto {
  id: string;
  url: string;
  width: number;
  height: number;
}

export interface FreelancerRef {
  businessId: string;
  /** The person, for opening a chat. */
  userId: string;
  username: string | null;
  name: string;
  headline: string;
  city: string | null;
  avatarUrl: string | null;
}

export interface GigPackage {
  tier: GigTier;
  name: string;
  /** What's included. */
  description: string;
  price: number;
  deliveryDays: number;
  revisions: number;
}

export interface GigQuestion {
  id: string;
  text: string;
  required: boolean;
}

export interface GigCard {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  photo: GigPhoto | null;
  priceFrom: number;
  fastestDays: number;
  freelancer: FreelancerRef;
  rating?: Rating;
}

export interface GigDetail extends GigCard {
  description: string;
  photos: GigPhoto[];
  packages: GigPackage[];
  questions: GigQuestion[];
  platformFee: number;
  status: GigStatus;
  canOrder: boolean;
  whyNot: string | null;
  /** The order rules in a sentence or two, for above the Pay button. */
  rules: string;
}

export interface GigsQuery {
  category?: string;
  city?: string;
  q?: string;
}

export interface PortfolioLink {
  id: string;
  title: string;
  url: string;
}

export interface FreelancerProfileFields {
  businessId: string;
  name: string;
  headline: string;
  bio: string | null;
  category: string;
  categoryLabel: string;
  skills: string[];
  languages: string[];
  city: string | null;
  avatarUrl: string | null;
  portfolio: { photos: GigPhoto[]; links: PortfolioLink[] };
  rating?: Rating;
}

export interface FreelancerPage extends FreelancerProfileFields {
  userId: string;
  username: string | null;
  /** Live gigs, newest first. */
  gigs: GigCard[];
  memberSince: string;
}

export interface MyFreelancer extends FreelancerProfileFields {
  /** `live` once a gig is published. */
  status: 'draft' | 'live';
  /** Base verification is done; publishing gigs and sending offers need it. */
  verified: boolean;
  /** Ruxstar is holding the profile: nothing can be sold. */
  suspended: boolean;
  /** Why and since when, while `suspended`. */
  hold: { reason: string; at: string } | null;
  gigs: { total: number; live: number; max: number };
  createdAt: string;
}

export interface FreelancerInput {
  name: string;
  headline: string;
  bio: string | null;
  category: string;
  skills: string[];
  languages: string[];
  city: string | null;
}

export interface PackageInput {
  tier: GigTier;
  /** Left out for Basic, Standard or Premium. */
  name?: string;
  description: string;
  price: number;
  deliveryDays: number;
  revisions: number;
}

export interface GigInput {
  title: string;
  category: string;
  description: string;
  packages: PackageInput[];
  questions: { text: string; required: boolean }[];
}

export interface MyGig extends GigDetail {
  publishedAt: string | null;
  removal: { reason: string; at: string } | null;
  /** What publishing still needs, in words. */
  missing: string[];
  /** Paid orders. */
  orders: number;
  createdAt: string;
  updatedAt: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  contentType: string;
  bytes: number;
  use: FileUse;
  createdAt: string;
}

export interface GigFile {
  id: string;
  name: string;
  contentType: string;
  bytes: number;
  /** Downloads it for 10 minutes. Null once the order's files were deleted. */
  url: string | null;
}

export type DeliveryAnswerKind = 'approved' | 'revision' | 'problem';

export interface GigDelivery {
  id: string;
  message: string;
  links: string[];
  files: GigFile[];
  at: string;
  answer: { kind: DeliveryAnswerKind; note: string | null; at: string } | null;
}

export interface GigRefund {
  kind: 'full' | 'part';
  amount: number;
  status: 'pending' | 'done';
  reason: string | null;
  at: string;
}

export type DisputeOutcome = 'full' | 'part' | 'none';
/** `vendor` is the freelancer. */
export type GigActor = 'customer' | 'vendor' | 'staff' | 'system';

export interface GigOrder {
  id: string;
  orderNo: number;
  status: GigOrderStatus;
  /** Whose view this is. */
  role: 'customer' | 'freelancer' | 'staff';
  title: string;
  category: string;
  /** Null for a custom offer. */
  gigId: string | null;
  quoteId: string | null;
  freelancer: Pick<FreelancerRef, 'businessId' | 'userId' | 'username' | 'name' | 'avatarUrl'>;
  customer: { id: string; name: string };
  package: { tier: GigTier | null; name: string; description: string; deliveryDays: number; revisions: number };
  answers: { question: string; answer: string }[];
  /** The customer's files for the brief. */
  files: GigFile[];
  note: string | null;
  price: { items: number; discount: number; platformFee: number; total: number };
  coupon: AppliedCoupon | null;
  /** The freelancer's and the console's view: what the freelancer gets once it completes. */
  share: number | null;
  refunds: GigRefund[];
  payBy: string | null;
  paidAt: string | null;
  acceptBy: string | null;
  acceptedAt: string | null;
  dueAt: string | null;
  /** Past its due date with nothing delivered. */
  late: boolean;
  revisions: { included: number; used: number; left: number };
  /** Oldest first. */
  deliveries: GigDelivery[];
  autoCompleteAt: string | null;
  completedAt: string | null;
  dispute: {
    reason: string;
    openedAt: string;
    ticketId: string;
    decision: { outcome: DisputeOutcome; amount: number; note: string; at: string } | null;
  } | null;
  cancellation: { by: GigActor; reason: string; at: string } | null;
  /** Every change of status, oldest first. */
  timeline: { status: GigOrderStatus; at: string; by: GigActor }[];
  filesDeleted: boolean;
  can: { pay: boolean; cancel: boolean; accept: boolean; decline: boolean; deliver: boolean; approve: boolean; revise: boolean; report: boolean };
  invoices: InvoiceRef[];
  canReview?: boolean;
  reviewUntil?: string | null;
  createdAt: string;
}

export interface PlacedGigOrder {
  order: GigOrder;
  /** Null when it was free and is paid already. */
  checkoutUrl: string | null;
}

export interface GigOrderInput {
  tier: GigTier;
  answers: { questionId: string; answer: string }[];
  fileIds?: string[];
  note?: string | null;
  coupon?: string;
  returnTo: string;
}

export interface QuotePayInput {
  fileIds?: string[];
  note?: string | null;
  coupon?: string;
  returnTo: string;
}

/** GET /v1/gigs/quotes/:id and withdrawing: the whole offer card, with its chat. */
export interface QuoteState extends QuoteCard {
  chatId: string;
  withdrawnAt: string | null;
}

/** A custom offer, as it shows in a chat. */
export interface QuoteCard {
  id: string;
  status: QuoteStatus;
  title: string;
  description: string;
  category: string;
  price: number;
  deliveryDays: number;
  revisions: number;
  expiresAt: string;
  freelancer: { businessId: string; name: string };
  orderId: string | null;
  canPay: boolean;
  canWithdraw: boolean;
}

export interface QuoteInput {
  title: string;
  description: string;
  category: string;
  price: number;
  deliveryDays: number;
  revisions: number;
  replyToId?: string;
}

export interface DeliverInput {
  message: string;
  links: string[];
  fileIds: string[];
}

export interface ConsoleFreelancer extends FreelancerProfileFields {
  ownerId: string;
  status: 'draft' | 'live';
  verified: boolean;
  suspended: boolean;
  gigs: number;
  orders: number;
  createdAt: string;
}

export interface ConsoleGig extends MyGig {
  vendorId: string;
}

export interface ConsoleGigsQuery {
  status?: GigStatus;
  freelancer?: string;
  q?: string;
}

export interface ConsoleGigOrdersQuery {
  status?: GigOrderStatus;
  freelancer?: string;
  q?: string;
}

export interface DecideInput {
  outcome: DisputeOutcome;
  /** Part refunds only. */
  amount?: number;
  note: string;
}

/** Ruxstar's freelancer rules as the console edits them. */
export interface GigCategory {
  key: string;
  label: string;
  hidden: boolean;
}

export interface GigsRuleSettings {
  categories: GigCategory[];
  autoCompleteDays: number;
  acceptHours: number;
  quoteDays: number;
  deliveryMaxMb: number;
  fileDays: number;
  maxGigs: number;
  maxPackages: number;
  minPrice: number;
  maxPrice: number;
  minDays: number;
  maxDays: number;
  maxRevisions: number;
  /** Photos and links on a portfolio, together. */
  maxPortfolio: number;
  maxGigPhotos: number;
  maxQuestions: number;
  /** On one brief or one delivery. */
  maxFiles: number;
  /** In one delivery. */
  maxLinks: number;
  /** Characters in one answer to a gig's question. */
  maxAnswer: number;
  /** Extensions that can be uploaded, out of the ones the API knows. */
  fileTypes: string[];
}
