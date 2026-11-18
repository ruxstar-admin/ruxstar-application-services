import { File } from 'expo-file-system';
import { apiDelete, apiGet, apiGetPage, apiPatch, apiPost, apiPostBytes, type WriteOptions } from '@/lib/api-client';
import type { CouponCheck } from '@/types/coupon';
import type {
  ConsoleFreelancer,
  ConsoleGig,
  ConsoleGigOrdersQuery,
  ConsoleGigsQuery,
  DecideInput,
  DeliverInput,
  FileUse,
  FreelancerInput,
  FreelancerPage,
  GigCard,
  GigDetail,
  GigInput,
  GigOrder,
  GigOrderInput,
  GigOrderStatus,
  GigStatus,
  GigTier,
  GigsQuery,
  GigsRules,
  MyFreelancer,
  MyGig,
  PlacedGigOrder,
  QuotePayInput,
  QuoteState,
  UploadedFile,
} from '@/types/gigs';

const id = (value: string) => encodeURIComponent(value);
type Done = { done: true };
const trimmed = (text: string | undefined) => text?.trim() || undefined;
/** A delivery's files can be large on a slow connection. */
const UPLOAD_TIMEOUT_MS = 3 * 60_000;
const PHOTO_TIMEOUT_MS = 60_000;

/** `/v1/gigs`: freelancers' gigs, their pages, ordering a package or paying an offer, the customer's orders and files. */
export const GigsService = {
  rules: (token: string) => apiGet<GigsRules>('/v1/gigs/rules', token),
  list: (token: string, query: GigsQuery, cursor?: string, limit?: number) =>
    apiGetPage<GigCard>('/v1/gigs', token, { category: query.category, city: trimmed(query.city), q: trimmed(query.q), cursor, limit }),
  get: (token: string, gigId: string) => apiGet<GigDetail>(`/v1/gigs/${id(gigId)}`, token),
  freelancer: (token: string, businessId: string) => apiGet<FreelancerPage>(`/v1/gigs/freelancers/${id(businessId)}`, token),
  /** Coupons for one package; with `code`, that code is checked too. */
  offers: (token: string, gigId: string, tier: GigTier, code?: string) => apiGet<CouponCheck>(`/v1/gigs/${id(gigId)}/offers`, token, { tier, code }),
  place: (token: string, gigId: string, body: GigOrderInput, options: WriteOptions) =>
    apiPost<PlacedGigOrder>(`/v1/gigs/${id(gigId)}/order`, { ...body }, token, options),
  /** Makes an order the freelancer has accepted already. */
  payQuote: (token: string, quoteId: string, body: QuotePayInput, options: WriteOptions) =>
    apiPost<PlacedGigOrder>(`/v1/gigs/quotes/${id(quoteId)}/pay`, { ...body }, token, options),
  quote: (token: string, quoteId: string) => apiGet<QuoteState>(`/v1/gigs/quotes/${id(quoteId)}`, token),
  /** Coupons for an offer you were sent; with `code`, that code is checked too. */
  quoteOffers: (token: string, quoteId: string, code?: string) => apiGet<CouponCheck>(`/v1/gigs/quotes/${id(quoteId)}/offers`, token, { code }),
  orders: (token: string, view: 'current' | 'past', cursor?: string) => apiGetPage<GigOrder>('/v1/gigs/orders', token, { view, cursor }),
  /** While it waits for payment, the API asks Cashfree whether it was paid. File links last 10 minutes. */
  order: (token: string, orderId: string) => apiGet<GigOrder>(`/v1/gigs/orders/${id(orderId)}`, token),
  pay: (token: string, orderId: string, returnTo: string) => apiPost<{ checkoutUrl: string }>(`/v1/gigs/orders/${id(orderId)}/pay`, { returnTo }, token),
  /** A full refund: before it's accepted, or once it's late. */
  cancel: (token: string, orderId: string, reason: string | undefined, options: WriteOptions) =>
    apiPost<GigOrder>(`/v1/gigs/orders/${id(orderId)}/cancel`, reason ? { reason } : {}, token, options),
  approve: (token: string, orderId: string, note: string | undefined, options: WriteOptions) =>
    apiPost<GigOrder>(`/v1/gigs/orders/${id(orderId)}/approve`, note ? { note } : {}, token, options),
  revision: (token: string, orderId: string, note: string, options: WriteOptions) =>
    apiPost<GigOrder>(`/v1/gigs/orders/${id(orderId)}/revision`, { note }, token, options),
  /** Opens a help ticket; Ruxstar decides the refund. */
  problem: (token: string, orderId: string, reason: string, options: WriteOptions) =>
    apiPost<GigOrder>(`/v1/gigs/orders/${id(orderId)}/problem`, { reason }, token, options),
  /** Any file type the API allows, sent as it is; the name's extension decides its type. */
  upload: async (token: string, file: { uri: string; name: string }, use: FileUse, options: WriteOptions) => {
    const data = await new File(file.uri).bytes();
    return apiPostBytes<UploadedFile>('/v1/gigs/files', { data, type: 'application/octet-stream' }, token, {
      query: { name: file.name, use },
      timeoutMs: UPLOAD_TIMEOUT_MS,
      headers: options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : undefined,
    });
  },
};

/** `/v1/gigs/me`: your freelancer profile, portfolio and gigs. */
export const FreelanceService = {
  /** NOT_FOUND until you start. */
  me: (token: string) => apiGet<MyFreelancer>('/v1/gigs/me', token),
  start: (token: string, body: FreelancerInput, options: WriteOptions) => apiPost<MyFreelancer>('/v1/gigs/me', { ...body }, token, options),
  update: (token: string, changes: Partial<FreelancerInput>) => apiPatch<MyFreelancer>('/v1/gigs/me', { ...changes }, token),
  addPortfolioPhoto: (token: string, jpeg: Uint8Array<ArrayBuffer>) =>
    apiPostBytes<MyFreelancer>('/v1/gigs/me/portfolio/photos', { data: jpeg, type: 'image/jpeg' }, token, { timeoutMs: PHOTO_TIMEOUT_MS }),
  removePortfolioPhoto: (token: string, itemId: string) => apiDelete<MyFreelancer>(`/v1/gigs/me/portfolio/photos/${id(itemId)}`, token),
  addLink: (token: string, body: { title: string; url: string }) => apiPost<MyFreelancer>('/v1/gigs/me/portfolio/links', { ...body }, token),
  removeLink: (token: string, itemId: string) => apiDelete<MyFreelancer>(`/v1/gigs/me/portfolio/links/${id(itemId)}`, token),
  gigs: (token: string, status?: GigStatus, cursor?: string) => apiGetPage<MyGig>('/v1/gigs/me/gigs', token, { status, cursor }),
  /** Saved as a draft. */
  create: (token: string, body: GigInput, options: WriteOptions) => apiPost<MyGig>('/v1/gigs/me/gigs', { ...body }, token, options),
  gig: (token: string, gigId: string) => apiGet<MyGig>(`/v1/gigs/me/gigs/${id(gigId)}`, token),
  /** Packages and questions are replaced whole. Orders made keep what they bought. */
  updateGig: (token: string, gigId: string, changes: Partial<GigInput>) => apiPatch<MyGig>(`/v1/gigs/me/gigs/${id(gigId)}`, { ...changes }, token),
  /** Only gigs never ordered. */
  removeGig: (token: string, gigId: string) => apiDelete<Done>(`/v1/gigs/me/gigs/${id(gigId)}`, token),
  addPhoto: (token: string, gigId: string, jpeg: Uint8Array<ArrayBuffer>) =>
    apiPostBytes<MyGig>(`/v1/gigs/me/gigs/${id(gigId)}/photos`, { data: jpeg, type: 'image/jpeg' }, token, { timeoutMs: PHOTO_TIMEOUT_MS }),
  removePhoto: (token: string, gigId: string, photoId: string) => apiDelete<MyGig>(`/v1/gigs/me/gigs/${id(gigId)}/photos/${id(photoId)}`, token),
  /** Needs verification and everything in `missing`. */
  publish: (token: string, gigId: string) => apiPost<MyGig>(`/v1/gigs/me/gigs/${id(gigId)}/publish`, undefined, token),
  pause: (token: string, gigId: string) => apiPost<MyGig>(`/v1/gigs/me/gigs/${id(gigId)}/pause`, undefined, token),
};

/** `/v1/gigs/desk`: the freelancer's orders: accepting, declining, delivering, cancelling, and withdrawing offers. */
export const GigDeskService = {
  orders: (token: string, status?: GigOrderStatus, cursor?: string) => apiGetPage<GigOrder>('/v1/gigs/desk/orders', token, { status, cursor }),
  order: (token: string, orderId: string) => apiGet<GigOrder>(`/v1/gigs/desk/orders/${id(orderId)}`, token),
  accept: (token: string, orderId: string, options: WriteOptions) => apiPost<GigOrder>(`/v1/gigs/desk/orders/${id(orderId)}/accept`, undefined, token, options),
  /** Paid orders only; a full refund, and the customer is told why. */
  decline: (token: string, orderId: string, reason: string, options: WriteOptions) =>
    apiPost<GigOrder>(`/v1/gigs/desk/orders/${id(orderId)}/decline`, { reason }, token, options),
  deliver: (token: string, orderId: string, body: DeliverInput, options: WriteOptions) =>
    apiPost<GigOrder>(`/v1/gigs/desk/orders/${id(orderId)}/deliver`, { ...body }, token, options),
  /** A full refund; the customer is told the reason. */
  cancel: (token: string, orderId: string, reason: string, options: WriteOptions) =>
    apiPost<GigOrder>(`/v1/gigs/desk/orders/${id(orderId)}/cancel`, { reason }, token, options),
  withdrawQuote: (token: string, quoteId: string) => apiPost<QuoteState>(`/v1/gigs/desk/quotes/${id(quoteId)}/withdraw`, undefined, token),
};

/** `/v1/ruxstar/gigs`: every freelancer, gig and order, taking gigs down and deciding reported problems. */
export const ConsoleGigsService = {
  freelancers: (token: string, q: string | undefined, cursor?: string) => apiGetPage<ConsoleFreelancer>('/v1/ruxstar/gigs/freelancers', token, { q: trimmed(q), cursor }),
  freelancer: (token: string, businessId: string) => apiGet<ConsoleFreelancer>(`/v1/ruxstar/gigs/freelancers/${id(businessId)}`, token),
  /** The same hold as a business's: their gigs hide and nothing new can be sold. They're told the reason. */
  suspend: (token: string, businessId: string, reason: string, key: string) =>
    apiPost<ConsoleFreelancer>(`/v1/ruxstar/gigs/freelancers/${id(businessId)}/suspend`, { reason }, token, { idempotencyKey: key }),
  restore: (token: string, businessId: string, key: string) =>
    apiPost<ConsoleFreelancer>(`/v1/ruxstar/gigs/freelancers/${id(businessId)}/restore`, undefined, token, { idempotencyKey: key }),
  gigs: (token: string, query: ConsoleGigsQuery, cursor?: string) =>
    apiGetPage<ConsoleGig>('/v1/ruxstar/gigs/listings', token, { ...query, q: trimmed(query.q), cursor }),
  gig: (token: string, gigId: string) => apiGet<ConsoleGig>(`/v1/ruxstar/gigs/listings/${id(gigId)}`, token),
  /** The freelancer is told the reason; placed orders go on. */
  takeDown: (token: string, gigId: string, reason: string, key: string) =>
    apiPost<ConsoleGig>(`/v1/ruxstar/gigs/listings/${id(gigId)}/take-down`, { reason }, token, { idempotencyKey: key }),
  orders: (token: string, query: ConsoleGigOrdersQuery, cursor?: string) =>
    apiGetPage<GigOrder>('/v1/ruxstar/gigs/orders', token, { ...query, q: trimmed(query.q), cursor }),
  order: (token: string, orderId: string) => apiGet<GigOrder>(`/v1/ruxstar/gigs/orders/${id(orderId)}`, token),
  /** Both sides are told the note; it goes on the help ticket too. */
  decide: (token: string, orderId: string, body: DecideInput, key: string) =>
    apiPost<GigOrder>(`/v1/ruxstar/gigs/orders/${id(orderId)}/decide`, { ...body }, token, { idempotencyKey: key }),
};
