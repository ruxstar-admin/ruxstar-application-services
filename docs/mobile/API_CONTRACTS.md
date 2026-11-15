# API contracts (what the app calls)

The hand-off to the backend team. One row per endpoint. **Status:** `real` = exists and the app uses
it · `mocked` = does not exist yet, the app uses a mock (`src/services/mock`) · `partial` = exists but
differs from what the screen needs (note says how). Base URL: `EXPO_PUBLIC_API_URL`. Auth: `Authorization: Bearer <access token>`.

Mocks are switched per route with `mocked: true|false`, or globally with `EXPO_PUBLIC_USE_MOCKS`.

## Account / auth (real, `/v1/account` — the API's OpenAPI spec is the source of truth)
Every `/v1` call sends `X-Client: app` and `X-App-Version`. Success is `{ data, meta }` (the client returns
`data`); failure is `{ error: { code, message, details } }`. Phone numbers are 10 digits without +91.

| Method + path | Request | Response | Used by | Notes |
|---|---|---|---|---|
| POST `/otp` | `{ phone, purpose: signup \| login \| reset }` | `{ sentTo, expiresInSeconds, resendInSeconds }` | Welcome, Login, Forgot, OTP resend | `PHONE_TAKEN` (signup) → Login; `NOT_FOUND` (login/reset); `OTP_LIMIT` with `retryAfterSeconds` |
| POST `/otp/verify` | `{ phone, purpose, code }` | `{ verificationToken, expiresInSeconds }` | OTP (signup, reset) | `OTP_INVALID` with `attemptsLeft`; `OTP_EXPIRED`; 5 wrong → 5-minute lock |
| POST `/signup` | `{ verificationToken, name, password, acceptTerms: true, username, dob, gender, email?, deviceId, deviceName }` | `{ user, tokens }` | Register details | `USERNAME_TAKEN`, `EMAIL_TAKEN`, `VALIDATION_FAILED` (dob under 13, name, password) |
| POST `/login` | `{ phone, password, deviceId, deviceName }` | `{ user, tokens }` | Login (password) | `INVALID_CREDENTIALS`; `ACCOUNT_LOCKED` after 5 tries, 15 minutes |
| POST `/login/code` | `{ phone, code, deviceId, deviceName }` | `{ user, tokens }` | OTP (login) | Code from `/otp` with purpose `login` |
| POST `/refresh` | `{ refreshToken }` | `{ tokens }` | API client | Single use; reuse ends the session |
| POST `/logout` | `{ refreshToken? }` (Bearer) | `{ done }` | Settings | |
| POST `/password/reset` | `{ verificationToken, password }` | `{ done }` | Reset password | `PASSWORD_REUSED` (last 3); signs out every device |
| GET `/usernames` | `?check=&name=` | `{ available, suggestions[] }` | Register, Edit profile | No sign-in needed; `name` seeds suggestions before signup |

Passwords: 8–64 characters with a letter and a number, not containing the phone number.

## Profile & settings
Your own profile and devices are real (`/v1/account`); the rest is mocked in `src/services/mock/profile.mocks.ts`.

| Method + path | Request | Response | Status | Used by |
|---|---|---|---|---|
| GET `/v1/account/me` | – (Bearer) | `User`, mapped to `Profile` | real | Profile, Edit profile |
| PATCH `/v1/account/me` | changed fields of name, username, email, bio, link, dob, gender, city (`null` clears) | `User` | real | Edit profile (photo waits for uploads) |
| GET `/v1/account/sessions` | – | `Session[]` (`label`, `client`, `current`, `lastSeenAt`) | real | Sessions & devices |
| DELETE `/v1/account/sessions/:id` | – | `{ done }` | real | Sessions & devices |
| GET `/v1/account/payments` | `cursor?` | `Payment[]` (`business`, `order`, `amount`, `paidAt`, `paymentId`, `status`, `refunds`), one per paid order | real | Your payments (Discover, Settings) |
| GET `/v1/account/payments/:id` | `id` = the order's ID | `Payment` | real | Order → View payment |
| POST `/users/profile` | `{ userId }` | `Profile` or 404 | mocked | User profile |
| GET / POST `/settings/notifications` | – / partial `NotificationPrefs` | `NotificationPrefs` | mocked | Notification preferences |
| GET `/settings/blocked` | – | `BlockedUser[]` | mocked | Blocked users |
| POST `/users/block` · `/users/unblock` | `{ userId, name, username }` · `{ userId }` | `{ message }` | mocked | Report sheet, Blocked users |
| POST `/users/report` | `{ userId, reason }` (spam · fake · abuse · undelivered · other) | `{ message }` | mocked | Report sheet |
| POST `/account/export` · `/account/pause` | – | `{ message }` | mocked | Account & data |
| DELETE `/v1/account/me` | `{ password }` | `{ done: true }` | live | Account & data |
| POST `/v1/account/email/code` · `/v1/account/email/verify` | – · `{ code }` | `{ sentTo, … }` · `User` | live | Edit profile |

Types: `src/types/profile.ts`. Service: `src/services/profile-service.ts`.

## Verification / KYC (all mocked — `src/services/mock/kyc.mocks.ts`)
| Method + path | Request | Response | Notes |
|---|---|---|---|
| GET `/kyc/status` | – | `{ base, vendor, delivery }` each `{ status: not_started | pending_review | verified | rejected, reason? }` | Mock auto-approves 6 s after submit; approval of vendor/delivery grants the role badge |
| POST `/kyc/aadhaar/send-otp` · `/kyc/aadhaar/verify-otp` | `{ aadhaar }` · `{ aadhaar, otp }` | `{ message, otp? }` · `{ ok }` | Via DigiLocker in production (PRD Module 6) |
| POST `/kyc/upload` | `{ kind: pan | selfie | shop | licence | vehicle, uri }` | `{ fileId }` | Real API should take multipart; mock takes the local URI |
| POST `/kyc/bank` | `{ accountNumber, ifsc }` | `{ ok, last4 }` | Penny-drop verification; 400 when it cannot be verified |
| POST `/kyc/vendor/business-id` | `{ businessId }` (GST or shop licence) | `{ ok }` | |
| POST `/kyc/delivery/licence` | `{ licenceNumber }` | `{ ok }` | |
| POST `/kyc/submit` | `{ flow: base | vendor | delivery }` | `{ status }` | Vendor/delivery require base verified (enforce server-side too) |

Types: `src/types/kyc.ts`. Service: `src/services/kyc-service.ts`.

## Social: feed, posts, search, notifications (all mocked — `src/services/mock/social.mocks.ts`)
All are POST with a JSON body (the mock registry keys on method + path; the real API may use GET with query params — adjust `social-service.ts` only).
| Path | Request | Response | Notes |
|---|---|---|---|
| `/feed/list` | `{ cursor? }` | `Page<Post>` (`{ items, nextCursor }`) | Global feed, 10 per page, newest first; no follow graph (PRD Module 4) |
| `/posts/get` · `/posts/create` · `/posts/update` · `/posts/delete` | `{ id }` · `{ text, images[] }` · `{ id, text }` · `{ id }` | `Post` / `{ message }` | Only the author may update/delete (403); images are local URIs in the mock — real API needs upload |
| `/posts/like` · `/posts/save` | `{ id, liked }` · `{ id, saved }` | `{ likes, likedByMe }` · `{ savedByMe }` | Idempotent |
| `/posts/comments` · `/posts/comment` | `{ id, cursor? }` · `{ id, text }` | `Page<Comment>` · `Comment` | Comments load page by page (scope review #9) |
| `PATCH /v1/social/comments/:id` (real API) | `{ text }` | `Comment` (with `editedAt`) | Only the author; people newly @mentioned are told, as when a post's text is edited |
| `/posts/report` | `{ id, reason }` | `{ message }` | Same reasons as user reports; goes to the moderation queue |
| `/search` | `{ q, scope: people | businesses | events | courses | stays }` | `SearchResult[]` | Min 2 chars; business/event/course/stay indexes by location + facilities per scope review #5. Discover's PG / hostel category uses the real `GET /v1/stays` instead (see PG / hostel below) |
| `/notifications/list` · `/unread-count` · `/read` · `/respond` | `{ cursor? }` · – · `{ id? }` · `{ id, accept }` | `Page<AppNotification>` · `{ count }` · `{ message }` | `respond` is for employment offers (Phase 7 owns the employment lifecycle) |

Types: `src/types/social.ts`. Service: `src/services/social-service.ts`.

## Chats (real API — `/v1/social/chats`, decision 37)
| Path | Request | Response | Notes |
|---|---|---|---|
| `GET /chats` · `GET /chats/unread` | `?box=chats\|requests&cursor&limit` · – | `Page<Chat>` · `{ unread, requests }` | Newest message first; the list and badge refresh every 15 s |
| `POST /chats/dm` · `POST /chats/groups` | `{ userId }` · `{ title, userIds[] }` | `ChatDetail` | Starting a 1:1 chat is idempotent; groups hold up to 50 (`CHAT_GROUP_FULL`) |
| `GET /chats/{id}` · `GET /chats/{id}/messages` | – · `?cursor&limit` | `ChatDetail` · `Page<ChatMessage>` newest first | Group members see messages from when they joined |
| `GET /chats/{id}/updates` | `?since` (server time) | `{ messages, unsent, seenAt, changed, now }` | Polled every 3 s while a thread is open; pass back `now`. Up to 100 messages a call; after a full page `now` points just past it, so the next poll brings the rest |
| `POST /chats/{id}/messages` · `POST /chats/{id}/photos` | `{ text }` or `{ postId }` · image bytes | `ChatMessage` | `Idempotency-Key` required. `CHAT_REQUEST_PENDING` until a request is accepted |
| `DELETE /chats/{id}/messages/{messageId}` | – | `{ done: true }` | Unsend your own message |
| `POST /chats/{id}/read` · `/accept` · `/decline` · `PUT /chats/{id}/mute` | – · – · – · `{ muted }` | `{ done: true }`, except accept: `ChatDetail` | |
| `PATCH /chats/{id}` · `POST /chats/{id}/people` · `PUT /chats/{id}/admins/{userId}` | `{ title }` · `{ userIds[] }` · – | `ChatDetail` | Admins only |
| `DELETE /chats/{id}/people/{userId}` · `POST /chats/{id}/leave` | – | `{ done: true }` | Removing someone is for admins |

Types: `src/types/chat.ts`. Service: `src/services/chat-service.ts`.

## Print order problems and refunds (real API — `/v1`, decision 38)
| Path | Request | Response | Notes |
|---|---|---|---|
| `POST /pod/orders/{id}/problem` | `{ kind: not_received \| wrong_item \| poor_quality \| damaged \| other, note }` | `Order` | `Idempotency-Key`. Only while `canReport` (48 h after delivery, or a late order not yet delivered); `REPORT_CLOSED` after, `CONFLICT` if one exists. Holds the shop's share |
| `POST /pod/orders/{id}/problem/photos` | image bytes | `Order` | `Idempotency-Key`; up to 3 while the problem is open; re-encoded to JPEG |
| `GET /pod/terms` | – | `{ commissionBps, platformFee, acceptHours, reportHours, filesDays, refundDays, payoutFee, minPayout }` | Payment conditions, with Ruxstar's current commission and fees. Shown before paying, before creating a print shop (with an "I agree" tick) and on the shop's Payment terms tile |
| `POST /vendor/orders/{id}/refund` | `{ amount ≥ 100, reason }` | `ShopOrder` | `Idempotency-Key`; at most `refundable` (the shop's share left, before it is released) |
| `GET /vendor/payments` | – | `Payments` with `upcoming[{ orderId, orderNo, amount, availableAt, held }]`, `withdrawal{ minimum, fee }`, `payouts[{ …, fee, failure }]` | Releases shares that are due and checks a pending payout before answering |
| `POST /vendor/payouts` | – | `Payout` | `Idempotency-Key`. Withdraws everything available, less the fee. `PAYOUT_METHOD_REQUIRED`, `PAYOUT_TOO_SMALL` (under the minimum), `PAYOUT_IN_PROGRESS`, `PAYOUTS_UNAVAILABLE` |
| `GET /vendor/payments/statement` | `?cursor&limit` | `StatementLine[]` `{ id, kind: paid\|available\|refund\|withdrawal\|returned, amount, at, module, order{ id, orderNo, business } \| null, payout{ id, to } \| null }`, `meta.nextCursor` | Newest first; amounts in paise, negative for refunds and withdrawals |
| `GET /ruxstar/reports/orders` · `GET /ruxstar/reports/orders/{id}` | `?status=open\|resolved&cursor` · – | `Page<StaffOrder>` · `StaffOrder` | `orders.view` |
| `POST /ruxstar/reports/orders/{id}/settle` | `{ outcome: refund_full \| refund_partial \| dismiss, amount?, note }` | `StaffOrder` | `orders.manage`, `Idempotency-Key`. A full refund moves the order to `refunded` |
| `GET /ruxstar/payouts` · `POST /ruxstar/payouts/{id}/check` | `?status=pending\|failed\|paid&cursor` · – | `Page<StaffPayout>` · `StaffPayout` | `payouts.view` · `payouts.manage`. Check answers `CONFLICT` once paid or failed. `payee` is `vendor` or `partner` (a delivery partner's) |
| `GET /ruxstar/held-orders` · `POST /ruxstar/held-orders/{id}/release` | `?orderNo&cursor` · `{ reason }` (5 to 300) | `Page<HeldOrder>` · `{ id, orderNo, amount, releasedAt }` | `payouts.view` · `payouts.manage`, `Idempotency-Key`. `ORDER_STATE` while a problem is open or once released. `partner` is set while a delivery partner's pay on the order is on hold |
| `PATCH /ruxstar/modules/ledger` | `{ payoutFee?, minPayout? }` (paise) | `ModuleSettings` with `payouts{ fee, minimum }` | `modules.manage`. The minimum must be at least ₹1 more than the fee |

## Coupons (real API — `/v1`, decision 41)
| Path | Request | Response | Notes |
|---|---|---|---|
| `POST /pod/quote` · `POST /pod/orders` | adds `couponCode?` | `Quote` adds `discount`, `coupon{ code, fundedBy, label } \| null`, `couponProblem`, `offers[{ code, fundedBy, label, terms, discount, problem }]` | The discount comes off the items only. Placing with a code that no longer works answers `COUPON_INVALID` |
| `GET /vendor/coupons` · `POST /vendor/coupons` · `PATCH /vendor/coupons/{id}` | `?cursor` · `NewCoupon` with `businessIds[]` (1 to 20) · `CouponPatch` | `Page<ManagedCoupon>` · `ManagedCoupon` | `Idempotency-Key` on create. `CONFLICT` when the code is taken; `FORBIDDEN` switching on a coupon Ruxstar switched off |
| `GET /ruxstar/coupons` · `POST /ruxstar/coupons` · `PATCH /ruxstar/coupons/{id}` | `?funder=ruxstar\|vendor&code&cursor` · `NewCoupon` with `modules[]` (pod, events, coaching, turf; print when left out) · `CouponPatch` | `Page<ManagedCoupon>` · `ManagedCoupon` | `coupons.view` · `coupons.manage`, `Idempotency-Key` on create. Modules can't change later. On a vendor's coupon only `active` can change |

Types: `src/types/coupon.ts`. Services: `src/services/coupon-service.ts` (vendor), `AdminService.coupons`, `createCoupon`, `updateCoupon`.

Order clocks (`acceptBy` 6 h, `readyBy`, release 48 h after delivery, delivered 7 days after `readyBy`) run on the API: a scheduler calls `POST /jobs/orders` every 10 minutes and order reads catch up too.

## Vendor team and Work (real API — `/v1`, decision 42)
| Path | Request | Response | Notes |
|---|---|---|---|
| `GET /vendor/businesses/{id}/team` · `POST` same | – · `{ username, permissions[], pay? }` | `Team{ members[], permissions[], max }` · `TeamMember` | Owner only. `Idempotency-Key` on invite. Members are invited, waiting (KYC) or active; up to `max` (20), invites included; an invite lasts 7 days. `pay` is `{ amount (paise, at least 100), per: month\|week\|day\|hour\|order, note (120) }` or null (DECISIONS 44) |
| `PATCH /vendor/businesses/{id}/team/{memberId}` · `DELETE` same | `{ permissions[]?, pay? }` (at least one) · – | `TeamMember` · `{ done }` | Pay changes only while invited; after that `409` on `body/pay`. Delete removes a member or cancels an invite |
| `GET /vendor/businesses/{id}/activity` | `?by=<userId>&cursor` | `Page<ActivityEntry{ id, at, who{ kind, id, name, username, avatar }, action, line, orderId }>` | Owner only, even on hold. `who.kind` is you, team, customer or ruxstar; customers and Ruxstar are never named, no IP |
| `GET /employment` · `POST /employment/{id}/accept\|decline\|leave` | – | `Work{ invites[], places[], permissions[] }` · `WorkPlace` or `{ done }` | A place's `access` is on, verify (identity KYC not approved yet) or on_hold. Invites and places carry `pay` (or null) |
| `GET /employment/{id}/orders` · `GET /employment/orders/{id}` | `?view&cursor` | `Page<TeamOrder>` · `TeamOrder` | `orders.view`. The shop's money is null without `earnings.view` |
| `POST /employment/orders/{id}/status` · `/refund` · `GET .../files/{fileId}` | `{ status, reason? }` · `{ amount, reason }` | `TeamOrder` · `{ url, expiresAt }` | `orders.move`, `orders.reject` for rejecting, `orders.refund`; `Idempotency-Key` on money calls |
| `GET\|PATCH /employment/{id}/shop` · `PATCH .../shop/pod` · `POST\|DELETE .../shop/photos` · `POST .../shop/open\|close` | `BusinessUpdate` (no GSTIN) · `PodSetupUpdate` · JPEG bytes | `Business` | `shop.details`, `shop.catalog`, `shop.open`. Publishing and deleting stay with the owner |
| `GET\|POST /employment/{id}/coupons` · `PATCH .../coupons/{couponId}` | `?cursor` · `NewCoupon` (this shop only) · `CouponPatch` | `Page<ManagedCoupon>` · `ManagedCoupon` | `coupons.manage`. Coupons for several shops are listed but only the owner changes them |
| `GET /ruxstar/businesses/{id}/team` · `POST .../team/{memberId}/remove` | – · `{ reason }` (5 to 300) | `Team` · `{ done }` | `businesses.view` · `businesses.manage`, `Idempotency-Key`. Both sides are told the reason |

Every team call checks the place, the permission, approved identity KYC and the business hold. A member's business post is the usual `POST /social/posts` with the shop's `businessId` (`posts.create`) and goes out under the owner's name. Types: `src/types/team.ts`. Services: `src/services/team-service.ts` (`TeamService`, `WorkService`, `TeamShopService`, `TeamCouponService`), `TeamOrderService` in `order-service.ts`, `AdminService.businessTeam` and `removeFromTeam`.

## Reviews: print shops, events, coaching, turf (real API — `/v1`, decision 43)
`{module}` is `pod`, `events`, `coaching`, `turf` or `stays`.

| Path | Request | Response | Notes |
|---|---|---|---|
| `GET\|PUT\|DELETE /{module}/orders/{id}/review` | – · `{ rating (1 to 5), text? (500, null clears) }` · – | `MyReview` or null · `MyReview` · `{ done }` | The order's customer, while `canReview` / `reviewUntil` are set on the order (30 days after delivery, the event, the last class or the game). 30 writes an hour. A removed review can't change (`CONFLICT`) |
| `GET /pod/shops/{id}/reviews` · `GET /{module}/{listingId}/reviews` | `?cursor&limit` | `Page<Review>` | Live reviews, newest first. For events, courses and grounds the list is the whole business's, so `EventDetail.rating` / `CourseDetail.rating` / `GroundDetail.rating` are the business's |
| `POST /{module}/reviews/{id}/report` | `{ reason (spam, fake, abuse, other), note? (300) }` | `{ done }` | Not your own. One open report per person and review |
| `GET /vendor/businesses/{id}/reviews` · `PUT\|DELETE .../reviews/{reviewId}/reply` | `?cursor` · `{ text }` (2 to 500) · – | `Page<ShopReview>` · `ShopReview` | Owner. Listing works on hold; replying doesn't. The customer is told about the first reply |
| `GET /employment/{id}/reviews` · `PUT\|DELETE .../reviews/{reviewId}/reply` | the same | the same | `reviews.reply` |
| `GET /ruxstar/reports/reviews` · `POST .../reports/reviews/{reviewId}/keep\|remove` | `?status&cursor` · – or `{ reason }` (5 to 300) | `Page<ReviewCase>` · `ReviewCase` | `reports.view` · `reports.act`, `Idempotency-Key`. Remove tells the customer the reason |

`rating { average, count }` is on `ShopCard`, `Shop` and `Business`: `average` is to one decimal and null until 3 live reviews. `overview.reports.reviews` counts reviews with open reports. Every review carries `module` and `listing{ type: event\|course\|ground\|property, id } \| null`; `product` is the event's, course's or ground's name. Vendor, team (`reviews.reply`) and console lists mix every module. Types: `src/types/review.ts`. Services: `src/services/review-service.ts` (`reviewsOf(module)`, `ReviewService` for print).

## Help tickets (real API — `/v1`, decision 48)
| Path | Request | Response | Notes |
|---|---|---|---|
| `GET /support/tickets` · `POST` same | `?cursor` · `{ category, subject (3 to 80), text (2000), context?{ type: order\|business\|verification\|post\|coupon\|delivery, id } }` | `Page<Ticket>` · `TicketDetail` | `Idempotency-Key` on create. Up to 5 open at once. A context must be yours, except a post; verification ids are `base` or `delivery`; a `delivery` is a delivery job id, opened from the delivery app by its rider only |
| `GET /support/tickets/{id}` · `POST .../messages` · `POST .../resolve` | – · `{ text }` · – | `TicketDetail` | Opening it marks Ruxstar's replies read. A reply reopens a resolved ticket for 7 days; `CONFLICT` once `closed` |
| `POST /support/tickets/{id}/messages/{messageId}/photos` | JPEG bytes | `TicketDetail` | Your own message, within 30 minutes, up to 3. Photo links work for 10 minutes |
| `POST /account/login` · `/login/code` | – | `423 ACCOUNT_ON_HOLD` with `details[0]{ message, supportToken, expiresAt }` | For an account on hold. The pass (2 hours) works as the bearer token on `/support` only; the reason is never sent |
| `GET /ruxstar/support/tickets` · `GET .../summary` · `GET .../agents` · `GET .../tickets/{id}` | `?status=open\|waiting\|resolved&category&assignee=me\|none&q&cursor` | `Page<StaffTicket>` · `{ open, waiting, overdue, unassigned, mine }` · `[{ id, name, title }]` · `StaffTicketDetail` | `support.view`. Latest activity first, with `overdue` on each; `q` is a ticket number with or without RX- |
| `POST /ruxstar/support/tickets/{id}/messages` · `PATCH .../tickets/{id}` | `{ text, internal?, status? }` · `{ status?, priority?, category?, assigneeId? }` | `StaffTicketDetail` | `support.manage`, `Idempotency-Key`. A reply waits on the customer and assigns an unassigned ticket to you; a note leaves the status. The customer is told about replies and resolving |
| `GET\|PUT /ruxstar/support/settings` | – · `{ hours{ urgent, high, normal, low } }` (1 to 336) | `{ hours, updatedAt }` | `support.view` · `support.manage`. Defaults 2, 8, 24 and 72 hours |
| `POST /ruxstar/kyc/{id}/reopen` | – | `ReviewCase` | `kyc.review`, `Idempotency-Key`. A case on hold gets one more try; the person is told (`kyc.reopened`) |

`overview.support { open, overdue, unassigned }` is set with `support.view`. Notifications `support.replied` and `support.resolved` link to `support`. Types: `src/types/support.ts`. Services: `src/services/support-service.ts` (`SupportService`, `SupportDeskService`), `AdminService.reopenCase`.

## Payments, Discover, orders (all mocked — `src/services/mock/commerce.mocks.ts`)
| Path | Request | Response | Notes |
|---|---|---|---|
| `/payments/start` · `/payments/confirm` | `{ amount, purpose }` · `{ sessionId, method: upi \| card \| netbanking }` | `{ sessionId, amount }` · `{ status: paid \| failed, reference? }` | Cashfree sits behind the ledger. Mock demo rule: the first **card** attempt in a session is declined so the retry UI can be seen |
| `/orders/list` | – | `Engagement[]` | One list across all modules; `refId` opens the module's detail screen |
| `/discover/list` | `{ module? }` | `Listing[]` | Aggregates listings from every module |

Every "create" below (order, ticket, enrolment, booking) takes `paymentRef` and must be **idempotent on it**: the app retries the create with the same reference if it fails after payment, so a customer is never charged twice.

## Print-on-demand (`pod.mocks.ts`)
| Path | Request | Response | Notes |
|---|---|---|---|
| `/pod/shop` | `{ id }` | `PrintShop` | Shop list comes from `/discover/list` |
| `/pod/upload` | `{ name, uri }` | `{ fileId, pages }` | Real API: multipart upload + page detection |
| `/pod/order` | `{ shopId, fileId, fileName, specs, fulfilment, address?, paymentRef }` | `PodOrder` | **Server recomputes the price** (`features/pod/lib/pricing.ts` is the shared rule): per-page rate × pages × copies (A3 ×2) + delivery fee by weight tier ≤500 g ₹40, ≤2 kg ₹70, else ₹120 — Ruxstar-set, never vendor-set. 402 without payment; 400 for invalid specs or missing delivery address |
| `/pod/order/get` | `{ id }` | `PodOrder` (with `timeline`) | Customer app polls every 8 s while open |
| `/pod/vendor/orders` · `/pod/vendor/advance` | – · `{ id }` | `PodOrder[]` · `PodOrder` | Path: placed → accepted → printing → ready → (out_for_delivery) → completed; 409 once finished |

## Events (real API — `/v1`, Architecture 10 Part B)
| Path | Request | Response | Notes |
|---|---|---|---|
| `GET /events/rules` | – | `EventRules` | Refund hours, waitlist hours, limits, commission and platform fee, all set in the console |
| `GET /events` · `GET /events/{id}` | `?city&kind&q&cursor` · – | `Page<EventCard>` · `EventDetail` | |
| `GET /events/{id}/offers` | `?items (paise)&code?` | `{ offers: CouponOffer[], checked: { code, discount, problem } \| null }` | On the BookTickets review step. A code is applied only when `checked.problem` is null; free tickets get none |
| `POST /events/{id}/tickets` | `BookTicketsBody` with `coupon?` | `{ order, checkoutUrl }` | `Idempotency-Key`, kept when a try times out. Free orders come back confirmed with no link. Unpaid seats are held 20 minutes. `COUPON_INVALID` drops the coupon; `TicketOrder` has `price.discount` and `coupon` |
| `POST /events/{id}/waitlist` · `DELETE /events/waitlist/{id}` | `{ tierId, quantity }` · – | `MyWait` | |
| `GET /events/orders` · `GET /events/orders/{id}` · `POST .../pay` · `POST .../cancel` | `?view=upcoming\|past&cursor` · – · `{ returnTo }` · – | `Page<TicketOrder>` · `TicketOrder` · `{ checkoutUrl }` · `TicketOrder` | `Idempotency-Key` on cancel. Reading an unpaid order asks Cashfree |
| `GET\|POST /vendor/businesses/{id}/events` · `GET\|PATCH\|DELETE /vendor/events/{id}` · `POST .../photo\|publish\|cancel` · `GET .../bookings` | `EventInput` · JPEG bytes · `{ reason }` · `?status&cursor` | `VendorEvent` · `Page<Booking>` | The list is up to 100, soonest first, not paged |
| `GET /events/desk` · `GET /events/desk/{id}` · `POST .../scan` · `GET .../lookup` · `POST .../tickets/{ticketId}/check-in` · `GET .../offline` · `POST .../sync` · `GET .../guests` | `{ qr }` · `?q` · – · – · `{ scans[] }` (up to 500) · `?view&cursor` | `DeskEvent` · `ScanResult` · `OfflineList` · `SyncResult` · `Page<Guest>` | Owner and team with "Scan tickets"; the guest list needs "See the guest list" |
| `GET /ruxstar/events` · `GET /ruxstar/events/{id}` · `POST /ruxstar/events/{id}/take-down` | `?status=draft\|live\|cancelled&q&cursor` · – · `{ reason }` (5 to 300) | `Page<VendorEvent>` · `VendorEvent` | `businesses.view` · `businesses.manage`, `Idempotency-Key`. Take-down cancels and refunds everyone; `CONFLICT` once cancelled or ended. `live` includes ended events |
| `PATCH /ruxstar/modules/events` | `{ eventRules: { refundHours? (0 to 720), waitlistHours? (1 to 48), maxTicketTypes? (1 to 10), maxQuestions? (0 to 10) } }` | `ModuleSettings` with `eventRules` | `modules.manage`. Send only what changes |

## GST invoices (real API — `/v1`, backend commit 78ed288)
| Path | Request | Response | Notes |
|---|---|---|---|
| `GET /account/invoices` · `GET /account/invoices/{id}` | `?kind&orderId&limit&cursor` · – | `Page<Invoice>` · `Invoice` | The customer's own documents. `Order.invoices` and `TicketOrder.invoices` carry `InvoiceRef[]` |
| `GET /vendor/invoices` · `GET /vendor/invoices/{id}` | `?business&kind&limit&cursor` · – | `Page<Invoice>` · `Invoice` | Newest first. No date filter, so the month chips walk up to 10 pages in the app. `StatementLine.invoice` links a statement line |
| `GET /vendor/invoices/export` | `?from&to&business` (YYYY-MM-DD, India time, up to a year) | `text/csv` | Up to 5,000 documents. Fetched through the API client so the token refresh still works, then saved and shared |
| `GET /ruxstar/invoices` · `GET /ruxstar/invoices/{id}` | `?kind&number (exact, up to 16)&orderNo&business&limit&cursor` · – | `Page<Invoice>` · `Invoice` | `orders.view` |
| `pdfUrl` on every `Invoice` | – | PDF | Signed `/invoice-files/{id}?exp&t`, good for 10 minutes; `&download=1` downloads. The app fetches the invoice again before each open or share |
| `GET /ruxstar/gst` | – | `GstSettings { seller, modules[] }` | `modules.view` |
| `PATCH /ruxstar/gst/modules/{module}` | `{ enabled?, code?, codeKind?, rateBps? (0 to 4000), tcsBps? (0 to 200) }` | `GstModuleSettings` | `modules.manage`, `Idempotency-Key`. `pricesIncludeTax: false` is refused, so the app shows it read only. Audited as `gst.module_update` |
| `PATCH /ruxstar/gst/seller` | `{ legalName?, tradeName?, gstin? \| null, address? \| null, feeCode?, feeRateBps? }` | `GstSellerSettings` | `modules.manage`, `Idempotency-Key`. The GSTIN's state code must match the address state. Audited as `gst.seller_update` |

## Coaching (real API — `/v1`, backend commit ad8dde4)
| Path | Request | Response | Notes |
|---|---|---|---|
| `GET /coaching/rules` | – | `CoachingRules` | Certificate %, minimum-check hours, limits, join minutes, commission and platform fee |
| `GET /coaching` · `GET /coaching/{id}` | `?city&category&online=true\|false&q&cursor` · – | `Page<CourseCard>` · `CourseDetail` | `myOrders` and `demoTaken` drive who can enrol or book a demo |
| `GET /coaching/batches/{id}/offers` | `?code` (3 to 20) | `{ offers: CouponOffer[], checked: { code, discount, problem } \| null }` | On the enrol Pay step. A code is applied only when `checked.problem` is null; a free batch gets none |
| `POST /coaching/batches/{id}/enrol` · `POST /coaching/{id}/demo` | `{ student: { childId }, coupon?, returnTo }` · `{ sessionId, student, returnTo }` | `{ order, checkoutUrl }` | `Idempotency-Key`, kept when a try times out. Free comes back confirmed. `COUPON_INVALID` takes the coupon off and shows the API's reason. Demos take no coupon |
| `GET /coaching/orders` · `GET /coaching/orders/{id}` · `POST .../pay` · `POST .../cancel` | `?view=current\|past&cursor` · – · `{ returnTo }` · – | `Page<CoachingOrder>` · `CoachingOrder` · `{ checkoutUrl }` · `CoachingOrder` | Full refund until the first class (`canCancel`); none after. `classes[].joinLink` shows from `joinFrom` |
| `GET /coaching/orders/{id}/materials\|messages` · `GET /coaching/timetable` · `GET /coaching/certificates` | – · `?from&days (1 to 31)` · `?cursor` | `Material[]` · `BatchMessage[]` · `TimetableEntry[]` · `Page<Certificate>` | File and PDF links are signed for 10 minutes; the app refetches before opening |
| `GET\|POST /coaching/children` · `PATCH\|DELETE /coaching/children/{id}` | `{ name (2 to 60), birthYear \| null }` | `Child` | Up to 10; a child with open bookings can't be removed |
| `GET\|POST /vendor/businesses/{id}/courses` · `GET\|PATCH\|DELETE /vendor/courses/{id}` · `POST .../photo\|publish` | `CourseInput` · JPEG bytes | `VendorCourse` | Owner only. Mode fixed once there's a batch |
| `POST /vendor/courses/{id}/batches` · `PATCH\|DELETE /vendor/batches/{id}` · `POST .../cancel` · `GET /vendor/courses/{id}/students` | `BatchInput` (either `classes` with `endDate: null`, or `classes: null` with `endDate`) · `{ reason (5 to 300) }` · `?batchId&kind&status&cursor` | `VendorCourse` · `Page<StudentRow>` | Schedule fields go together; fixed once anyone holds or has a seat |
| `/coaching/desk/*`: `batches`, `today`, `batches/{id}`, `classes/{id}`, `PUT classes/{id}/attendance`, `classes/{id}/cancel\|move`, `batches/{id}/classes`, `batches/{id}/messages\|materials\|students`, `batches/{id}/materials/file`, `DELETE materials/{id}` | `{ marks[] }` · `{ reason }` · `{ startsAt, minutes?, reason? }` · `{ startsAt, minutes }` · `{ text }` · `{ title, url }` · bytes with `?title&wholeCourse` | `DeskBatch`, `TodayClass`, `ClassRoster`, `Material`, `BatchMessage`, `DeskStudent` | Owner, or a team coach of the batch with `classes.*` permissions. Writes take `Idempotency-Key` |
| `GET /ruxstar/coaching/courses` · `GET .../{id}` · `POST .../{id}/take-down` | `?status=draft\|live\|removed&category&q&cursor` · – · `{ reason }` | `Page<VendorCourse>` · `VendorCourse` | `businesses.view` · `businesses.manage`, `Idempotency-Key` |
| `PATCH /ruxstar/modules/coaching` | `{ coachingRules: { certificatePercent?, minimumHours?, maxBatchSize?, maxClasses?, maxBatches?, maxDemoFee? (paise), maxDemoSeats?, joinMinutes? } }` | `ModuleSettings` with `coachingRules` | `modules.manage`. Send only what changes |

## Sports & Turf (real API — `/v1`, backend commit f42eff5)
| Path | Request | Response | Notes |
|---|---|---|---|
| `GET /turf/rules` · `GET /turf/sports` | – | `TurfRules` · `Page<Sport>` | Refund defaults and limits, repeat weeks, hold minutes, slot lengths, max slots, book-ahead days, commission and platform fee |
| `GET /turf` · `GET /turf/{id}` · `GET /turf/{id}/reviews` | `?city&sport&q&cursor` · – · `?cursor` | `Page<GroundCard>` · `GroundDetail` · `Page<Review>` | `canBook` / `whyNot`; `courtList` has hours, prices (base, weekend, peak windows) and add-ons |
| `GET /turf/courts/{id}/slots` | `?date` | `DaySlots` | Started slots aren't listed. `bookable` is false past `bookAheadDays`. The app checks later weeks of a weekly booking with one call per week |
| `POST /turf/courts/{id}/offers` | `{ startAts[], addOns?, weeks?, code? }` | `{ offers, checked }` | A code is applied only when `checked.problem` is null |
| `POST /turf/courts/{id}/book` | `{ startAts[] (back to back), sport?, addOns?, weeks?, coupon?, returnTo }` | `{ booking, checkoutUrl }` | `Idempotency-Key`, kept when a try times out. A taken slot is a 409 that names it ("Sat, 21 Nov, 7–8 pm is booked…"); the app shows it and reloads the slots. `COUPON_INVALID` drops the coupon |
| `GET /turf/orders` · `GET /turf/orders/{id}` · `POST .../pay` · `POST .../cancel` | `?view=current\|past&cursor` · – · `{ returnTo }` · `{ occurrences? }` | `Page<TurfBooking>` · `TurfBooking` · `{ checkoutUrl }` · `TurfBooking` | Cancel takes `Idempotency-Key`; leaving out `occurrences` cancels every date still to come. Each date's `refundIfCancelled` follows the ground's tiers |
| `GET\|PUT\|DELETE /turf/orders/{id}/review` | `{ rating, text? }` | `MyReview` | When `canReview` |
| `GET\|POST /vendor/businesses/{id}/grounds` · `GET\|PATCH\|DELETE /vendor/grounds/{id}` · `POST .../photos` · `DELETE .../photos/{photoId}` · `POST .../publish` | `GroundInput` · JPEG bytes | `VendorGround` | Owner only. Create and publish take `Idempotency-Key`; publish lists every missing item. Up to 8 photos |
| `POST /vendor/grounds/{id}/courts` · `PATCH\|DELETE /vendor/courts/{id}` | `CourtInput` | `VendorGround` | Add takes `Idempotency-Key`. A court with bookings to come can't be deleted |
| `GET /turf/desk/grounds` · `GET .../grounds/{id}/board` · `GET .../grounds/{id}/bookings` · `GET .../orders/{id}` | – · `?date` · `?view=upcoming\|past\|all&cursor` | `Page<DeskGround>` · `Board` · `Page<DeskBooking>` · `DeskBooking` | Owner, or team members with `turf.*` permissions (`permissions` on each ground). No single-ground route; the app finds it in the list |
| `POST /turf/desk/slots/block\|unblock` · `POST /turf/desk/orders/{id}/cancel\|arrival` · `PUT /turf/desk/courts/{id}/prices` | `{ courtId, startAts[], note? }` · `{ occurrences?, reason }` · `{ n, status }` · `{ prices?, addOns? }` | `{ done }` · `DeskBooking` · `VendorGround` | Block, unblock, cancel and arrival take `Idempotency-Key`. Desk cancel always refunds in full. Arrived from 30 min before; no-show from the start; until a day after |
| `GET /ruxstar/turf/grounds` · `GET .../{id}` · `POST .../{id}/take-down` | `?status&q&cursor` · – · `{ reason }` | `Page<ConsoleGround>` · `{ ground, bookings }` · `{ ground, refunded }` | `businesses.view` · `businesses.manage`, `Idempotency-Key` |
| `GET\|POST /ruxstar/turf/sports` · `PATCH .../sports/{key}` | `{ key, name, order? }` · `{ name?, active?, order? }` | `ConsoleSport` | `businesses.view` to read; `modules.manage` to change. Add takes `Idempotency-Key` |
| `PATCH /ruxstar/modules/turf` | `{ turfRules: { refundFullHours?, refundHalfHours?, halfPercent?, minFullHours?, maxFullHours?, maxRepeatWeeks?, holdMinutes?, slotLengths?, maxSlots?, bookAheadDays?, maxGrounds?, maxCourts?, maxAddOns? } }` | `ModuleSettings` with `turfRules` | `modules.manage`. Send only what changes |

## PG / hostel (real API — `/v1`, backend commit 0927688)
The old `stays.mocks.ts` and its screens are gone.

| Path | Request | Response | Notes |
|---|---|---|---|
| `GET /stays/rules` · `GET /stays/facilities` | – | `StaysRules` · `Page<Facility>` | Refund days and limits, objection hours, max months / nights, hold minutes, book-ahead days, limits, commission and platform fee |
| `GET /stays` · `GET /stays/{id}` · `GET /stays/{id}/reviews` | `?city&area&q&kind&for&occupant&stay&budget&room&food&meals&facilities&allows&noticeMax&near&cursor` · – · `?cursor` | `Page<PropertyCard>` · `PropertyDetail` · `Page<Review>` | Budget is paise for the `stay` unit; csv fields must all match; `for` / `occupant` also match places open to anyone. `canReserve` / `whyNot`, `kycRequired: true` |
| `GET /stays/{id}/availability` | `?moveIn&stay=month\|night&months\|nights` | `Availability` | Months only with `stay=month`, nights only with `stay=night`. Each room's beds are `free`, `taken` or `closed`, with `bedTotal` / `roomTotal` for the stay |
| `POST /stays/rooms/{id}/offers` · `POST /stays/rooms/{id}/reserve` | `{ moveIn, stay, months?\|nights?, bedId?\|whole?, code? }` · the same with `coupon?, returnTo` | `{ offers, checked }` · `{ reservation, checkoutUrl }` | Reserve takes `Idempotency-Key`, kept when a try times out. Needs approved identity KYC (`KYC_REQUIRED`). A taken bed is a 409; the app reloads availability. Beds are held 15 minutes (`holdMinutes`). `COUPON_INVALID` drops the coupon. The deposit is paid to the owner, not through Ruxstar |
| `GET /stays/orders` · `GET /stays/orders/{id}` · `POST .../pay` · `POST .../cancel` | `?view=current\|past&cursor` · – · `{ returnTo }` · `{ reason? }` | `Page<StayReservation>` · `StayReservation` · `{ checkoutUrl }` · `StayReservation` | Cancel takes `Idempotency-Key`; `refundIfCancelled` follows the property's refund days |
| `POST\|DELETE /stays/orders/{id}/objection` · `POST /stays/orders/{id}/notice` | `{ reason }` (5 to 500) · – · `{ on? }` | `StayReservation` | `Idempotency-Key`. An objection is allowed until `objectionUntil` (24 h after "Moved in" by default) and holds the owner's money. Notice defaults to the earliest day (`noticeFrom`) |
| `GET\|PUT\|DELETE /stays/orders/{id}/review` | `{ rating, text? }` | `MyReview` | When `canReview` |
| `GET\|POST /vendor/businesses/{id}/properties` · `GET\|PATCH\|DELETE /vendor/properties/{id}` · `POST .../photos` · `DELETE .../photos/{photoId}` · `POST .../publish` | `PropertyInput` · JPEG bytes | `VendorProperty` | Owner only. Create and publish take `Idempotency-Key`; publish lists every missing item. Up to 10 photos. Only drafts with no reservations can be deleted |
| `POST /vendor/properties/{id}/rooms` · `PATCH\|DELETE /vendor/rooms/{id}` | `RoomInput` (`wholeRoom` for shared rooms only) | `VendorProperty` | Add takes `Idempotency-Key`. A room with reservations to come can't be deleted |
| `GET /stays/desk/properties` · `GET .../properties/{id}/board` · `GET .../properties/{id}/reservations` · `GET .../properties/{id}/tenants` · `GET .../orders/{id}` | – · `?date` · `?view=upcoming\|staying\|past\|all&cursor` · `?cursor` · – | `Page<DeskProperty>` · `BedBoard` · `Page<DeskReservation>` · `DeskReservation` | Owner, or team members with `stays.*` permissions (`permissions` on each property). The board is one day; the app asks for 7 days at once for the bed map |
| `POST /stays/desk/orders/{id}/moved-in\|move-out\|cancel` · `POST /stays/desk/beds/{id}/status` · `POST /stays/desk/rooms/{id}/status` | – · `{ on?, reason? }` · `{ reason }` · `{ status: open\|closed }` · `{ status: live\|paused }` | `DeskReservation` · bed · `VendorProperty` | All take `Idempotency-Key`. `stays.movein` for moved-in and move-out (shorten only), `stays.cancel` for cancel (always a full refund, not once released), `stays.beds` for beds and rooms |
| `PATCH /stays/desk/properties/{id}` · `PUT /stays/desk/rooms/{id}/prices` | `Partial<PropertyInput>` · `{ prices: { month, night } }` | `VendorProperty` | `stays.listing`. Reservations already made keep their price |
| `GET /ruxstar/stays/properties` · `GET .../{id}` · `POST .../{id}/take-down` | `?status&city&cursor` · – · `{ reason }` (5 to 300) | `Page<ConsoleProperty>` · `{ property, reservations }` · `{ property, refunded }` | `businesses.view` · `businesses.manage`, `Idempotency-Key`. Take-down refunds reservations not moved in yet |
| `GET /ruxstar/stays/objections` · `POST /ruxstar/stays/reservations/{id}/objection` | `?status=open\|withdrawn\|released\|refunded&cursor` · `{ decision: release\|refund, note (5 to 500) }` | `Page<ConsoleReservation>` · `ConsoleReservation` | `orders.view` · `orders.manage`, `Idempotency-Key`. `release` pays the owner; `refund` returns everything and ends the stay |
| `GET\|POST /ruxstar/stays/facilities` · `PATCH .../facilities/{key}` | `{ key, name, order? }` · `{ name?, active?, order? }` | `ConsoleFacility` | `businesses.view` to read; `modules.manage` to change. Add takes `Idempotency-Key` |
| `PATCH /ruxstar/modules/stays` | `{ staysRules: { refundDays?, maxRefundDays?, objectionHours?, maxMonths?, maxNights?, holdMinutes?, bookAheadDays?, maxProperties?, maxRooms?, maxBeds? } }` | `ModuleSettings` with `staysRules` | `modules.manage`. Send only what changes |

Notifications `stays.reserved` and `stays.updated` link to `stay_property`, `stay_order` or `vendor_property`. GST documents for a stay have `order.type: stay_reservation`. Coupons: vendor coupons cover stays businesses and Ruxstar coupons can work on `stays`. Types: `src/types/stays.ts`. Services: `src/services/stays-service.ts` (`StaysService`, `VendorStaysService`, `StaysDeskService`, `ConsoleStaysService`).

## Local shops (real API — `/v1`, backend module `shop`, commit 98d44b7)
The app calls it "store" in code so it never mixes with print-on-demand's shop; people read "shop". A store's id is its business id.

| Path | Request | Response | Notes |
|---|---|---|---|
| `GET /shop/rules` | – | `StoreRules` | Return days, max options (2), release hours, hold and accept times, product / variant / value / line / quantity limits, commission and platform fee |
| `GET /shop` · `GET /shop/{id}` | `?city&type&q&cursor` · – | `Page<StoreCard>` · `StoreDetail` | `canOrder` / `whyNot`; `setup` has delivery, pickup, radius (null is the whole city), fee, min order and returns |
| `GET /shop/products` · `GET /shop/products/{id}` · `GET .../{id}/reviews` | `?city&shop&q&inStock&cursor` · – · `?cursor` | `Page<ProductCard>` · `ProductDetail` · `Page<Review>` | A combination missing from `variants` isn't sold; `stock: 0` is sold out |
| `POST /shop/{id}/quote` | `{ lines: [{ productId, variantId, quantity }], method: delivery\|pickup, address?, code? }` | `StoreQuote` (`lines` with `stock`, `delivery`, `deliveryKm`, `discount`, `total`, `returnRule`, coupon `offers` / `checked`) | Throws rather than returns problems: `CONFLICT` for stock, `ORDER_INVALID` (path `body/lines/i`) for min order, radius or city. One shop per order |
| `POST /shop/{id}/orders` · `POST /shop/orders/{id}/pay` | the quote body with `address`, `coupon?`, `note?`, `returnTo` · `{ returnTo }` | `{ order, checkoutUrl }` · `{ checkoutUrl }` | `Idempotency-Key`, kept when a try times out. `returnTo` gets `?order=id`. Stock is only taken when it's paid; the checkout is open `holdMinutes` |
| `GET /shop/orders` · `GET /shop/orders/{id}` · `POST .../cancel` · `POST .../return` | `?view=current\|past\|all&cursor` · – · `{ reason? }` · `{ reason, note?, lines? }` | `Page<StoreOrder>` · `StoreOrder` | Cancel is a full refund until packed. A return is open `returnDays` after delivery when the shop takes returns; `wrong_item` and `damaged` make the shop pay the trip back, otherwise one delivery fee comes off |
| `GET\|PUT\|DELETE /shop/orders/{id}/products/{productId}/review` | `{ rating, text? }` | `MyReview` | One review per product of a delivered order (`reviewable`) |
| `GET\|PUT /vendor/businesses/{id}/shop` | `Partial<StoreSetup>` | `StoreSetupOne` | Owner only. Radius 1–50 km, fees capped by the delivery module's `shopFeeMax` |
| `GET\|POST /vendor/businesses/{id}/products` · `GET\|PATCH\|DELETE /vendor/products/{id}` · `PUT\|DELETE .../photo` | `?status&q&lowStock&cursor` · `ProductBody` · JPEG bytes | `VendorProduct` | Owner only. Create takes `Idempotency-Key`. Sending `variants` replaces the table, stock included; with `options`, send `variants` too. A banned word is refused. One photo |
| `GET /shop/desk/stores` · `GET .../stores/{id}/orders` · `GET /shop/desk/orders/{id}` | – · `?view=open\|returns\|done\|all&cursor` · – | `Page<DeskStore>` · `Page<DeskStoreOrder>` · `DeskStoreOrder` | Owner, or team with `store.orders`. `permissions` on each store |
| `POST /shop/desk/orders/{id}/move\|cancel` · `GET\|POST\|DELETE .../delivery` | `{ status }` · `{ reason }` · `{ carrier }` | `DeskStoreOrder` · `DeliveryOptions` | `Idempotency-Key`. `store.move` (and delivery, packed orders only), `store.cancel` (always a full refund) |
| `POST /shop/desk/orders/{id}/return/decide\|received` | `{ decision: approve\|reject, note? }` · `{ note? }` | `DeskStoreOrder` | `store.returns`, `Idempotency-Key`. A note is required to reject. Received refunds the customer |
| `GET /shop/desk/stores/{id}/products` · `PATCH /shop/desk/products/{id}` · `PUT .../stock` | `VendorProductsQuery` · `ProductPatch` · `{ variants: [{ variantId, stock }] }` | `Page<VendorProduct>` · `VendorProduct` | `store.stock` to list and set stock, `store.products` to edit. No team route reads one product; the app edits the copy from the list |
| `GET /ruxstar/shop/stores` · `GET .../stores/{id}` | `?city&q&cursor` · – | `Page<ConsoleStore>` · `ConsoleStoreOne` | `businesses.view` |
| `GET /ruxstar/shop/products` · `GET .../{id}` · `POST .../{id}/take-down` | `?status&shop&city&q&cursor` · – · `{ reason }` (5 to 300) | `ConsoleProduct` | `businesses.view` · `businesses.manage`, `Idempotency-Key`. Orders already placed carry on |
| `GET /ruxstar/shop/orders` · `GET .../{id}` · `POST .../{id}/cancel` · `POST .../{id}/return` | `?shop&status&returns=open\|rejected&cursor` · – · `{ reason }` · `{ decision: approve\|reject\|refund, note }` (5 to 500) | `ConsoleStoreOrder` | `orders.view` · `orders.manage`, `Idempotency-Key` |
| `GET\|POST /ruxstar/shop/banned` · `PATCH .../banned/{key}` | `{ key, name, words }` · `{ name?, words?, active? }` | `BannedCategory` | `businesses.view` to read; `modules.manage` to change. Up to 100 words of 2–40 characters, matched as whole words |
| `PATCH /ruxstar/modules/shop` | `{ shopRules: { returnDays?, maxOptions?, releaseHours?, holdMinutes?, acceptHours?, maxProducts?, maxVariants?, maxValues?, maxLines?, maxQuantity? } }` | `ModuleSettings` with `shopRules` | `modules.manage`. Orders already placed keep their return days |

The shop's money is released `releaseHours` after delivery or when the return window ends, whichever is later. Payments and statement lines with `module: shop` open the shop order. Coupons: vendor coupons cover shop businesses and Ruxstar coupons can work on `shop`. Types: `src/types/store.ts`. Services: `src/services/store-service.ts` (`StoreService`, `VendorStoreService`, `StoreDeskService`, `ConsoleStoreService`).

## Console stats (real API — `/v1`, backend commit 6526b06)
| Path | Request | Response | Notes |
|---|---|---|---|
| `GET /ruxstar/stats` | `?module=pod\|events\|coaching\|turf\|stays\|shop\|delivery` | `Stats { asOf, module, people, modules[], money, queues }` | Staff. Each section or count is null without its permission (`users.view` people, `businesses.view` businesses and listings, `orders.view` orders, `payouts.view` money, each queue its own). With `module`, `people`, `money` and `queues` are null and `modules` holds that one. Paise; today, this week (from Monday) and this month are India time. Numbers are kept up to 60 s; `asOf` is the oldest. `money.payouts.{pending,failed,paidThisMonth}` are `{ count, amount }` |

The dashboard uses it for queues (amber above 0), people, money and one card per module; `/ruxstar/overview` still gives the staff count and which modules are live, and the help desk summary who tickets wait on. Each module's settings screen shows its own block with `?module=`. Types: `Stats` in `src/types/admin.ts`. Service: `AdminService.stats`.

## Money: ledger, payouts, coupons, cancellation (`money.mocks.ts`, state in `commerce-state.ts`)
`/payments/start` now takes `{ amount, itemTotal, purpose, module?, couponCode? }` and returns `{ sessionId, amount, discount }` — **the server validates the coupon and is authoritative**; `amount` = lines incl. delivery, `itemTotal` = the part a coupon may discount (never the delivery fee). A confirmed payment's `reference` links the purchase to the ledger.

| Path | Request | Response | Notes |
|---|---|---|---|
| `/vendor/earnings` | – | `{ total, pending, withdrawable, withdrawn, nextSettlement }` | Pending until the order completes or 7 days pass, whichever is first; weekly run on Mondays. The demo treats eligible money as withdrawable immediately |
| `/vendor/ledger` | `{ cursor? }` | `Page<LedgerEntry>` | Each line: `gross`, `discount`, `fundedBy`, `commission`, `deliveryFee`, `vendorNet`, `status`. **vendorNet = gross − module commission − vendor-funded discount**; a Ruxstar-funded coupon never lowers it; the delivery fee goes to the rider. Commission rates (mock): POD 8 %, Events 10 %, Coaching 12 %, PG 6 % — backend owns the real ones |
| `/payouts/list` · `/add-upi` · `/withdraw` · `/withdrawals` | – · `{ upi }` · `{ accountId, amount }` · – | `PayoutAccount[]` · `PayoutAccount` · `Withdrawal` · `Withdrawal[]` | Only verified bank/UPI; min ₹100; cannot exceed withdrawable (409); UPI verified by penny-drop (400 if it fails) |
| `/coupons/validate` | `{ code, itemTotal, module? }` | `{ code, discount, fundedBy }` | 404 unknown/inactive; 409 wrong module |
| `/vendor/coupons` · `/create` · `/toggle` | – · `{ code, percent, cap, module? }` · `{ code, active }` | `Coupon[]` · `Coupon` · `{ message }` | Vendor coupons are vendor-funded; Ruxstar coupons are managed on the website |
| `/orders/cancel-quote` · `/orders/cancel` | `{ refId }` | `{ allowed, refundable, summary }` · `{ refunded, message }` | Inside the window a cancel refunds in full with **no approval**; 409 once complete or after 7 days; **coaching dropout after the first session is allowed but refunds ₹0**; whole-batch cancel refunding everyone and admin force-refund are backend/web |

## Delivery (real API, DECISIONS 45)
The mock partner area is gone; riders use the Ruxstar Delivery app (`/v1/delivery/*`, `X-Client: delivery`). This app calls:

| Path | Request | Response | Notes |
|---|---|---|---|
| `PATCH /v1/kyc/delivery` | `{ licenceNumber?, vehicleType?, vehicleNumber? }` | `DeliveryCase` | Opens once identity is approved; spaces and dashes are fine |
| `PUT /v1/kyc/delivery/photos/{licence\|vehicle}` | JPEG bytes | `DeliveryCase` | 1600 px; kept 30 days after approval |
| `POST /v1/kyc/delivery/submit` | – | `DeliveryCase` | Reviewed in the console (`GET /v1/ruxstar/kyc?track=delivery`); approval sets `roles.delivery` |
| `GET /v1/vendor/orders/:id/delivery` · `/v1/employment/orders/:id/delivery` | – | `DeliveryOptions` | Team riders (with "Deliver orders" and an approved delivery case) and the Ruxstar partner option: pay, km, online count, or why not |
| `POST …/orders/:id/delivery` | `{ carrier: 'team', placeId } \| { carrier: 'partner' }` + `Idempotency-Key` | `ShopOrder` | Ready orders only. A partner offer goes to online partners in the shop's city; the first to accept gets it |
| `DELETE …/orders/:id/delivery` | – | `ShopOrder` | Before pickup only; the order stays ready for the shop |

`POST /v1/pod/quote` and order placing take `address.point { lat, lng }`; the price has `delivery` and `deliveryKm` (road km, rounded up). `Order.delivery` gives the customer the rider, vehicle, status and `dropCode`; `ShopOrder.delivery` adds `jobId`, `pay` and `offerUntil`. The console's `PATCH /v1/ruxstar/modules/{module}` takes `gstinRequired` (business modules) and `riderRate`, `shopFeeMax` and `offerMinutes` (delivery).

Types: `src/types/{commerce,pod,events,coaching,stays,money}.ts`. Services: `src/services/{commerce,pod,events,coaching,stays}-service.ts`.

Backend gaps still open (not mocked): login attempt counter + 30-min lockout, suspended-vs-disabled status, session/device registration.

Types: `src/types/auth.ts`. Service: `src/services/auth-service.ts`.

## Planned (added to this table as each phase starts)
Sessions & devices · notification preferences · blocked users · KYC (Aadhaar, PAN, face, bank, GST, delivery) · feed, posts, reports · messages/groups/communities · employment · Print-on-demand · Events · Coaching · PG/hostel · ledger/payments/withdrawals.
