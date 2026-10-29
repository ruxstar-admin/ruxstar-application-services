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
| POST `/users/profile` | `{ userId }` | `Profile` or 404 | mocked | User profile |
| GET / POST `/settings/notifications` | – / partial `NotificationPrefs` | `NotificationPrefs` | mocked | Notification preferences |
| GET `/settings/blocked` | – | `BlockedUser[]` | mocked | Blocked users |
| POST `/users/block` · `/users/unblock` | `{ userId, name, username }` · `{ userId }` | `{ message }` | mocked | Report sheet, Blocked users |
| POST `/users/report` | `{ userId, reason }` (spam · fake · abuse · undelivered · other) | `{ message }` | mocked | Report sheet |
| POST `/account/export` · `/account/pause` · `/account/delete` | – | `{ message }` | mocked | Account & data |

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
| `/posts/report` | `{ id, reason }` | `{ message }` | Same reasons as user reports; goes to the moderation queue |
| `/search` | `{ q, scope: people | businesses | events | courses | stays }` | `SearchResult[]` | Min 2 chars; business/event/course/stay indexes by location + facilities per scope review #5 |
| `/notifications/list` · `/unread-count` · `/read` · `/respond` | `{ cursor? }` · – · `{ id? }` · `{ id, accept }` | `Page<AppNotification>` · `{ count }` · `{ message }` | `respond` is for employment offers (Phase 7 owns the employment lifecycle) |

Types: `src/types/social.ts`. Service: `src/services/social-service.ts`.

## Messages, groups, communities (all mocked — `src/services/mock/chat.mocks.ts`)
| Path | Request | Response | Notes |
|---|---|---|---|
| `/chat/conversations` | – | `Conversation[]` (joined only, newest first) | kinds: `dm`, `group`, `community` |
| `/chat/communities/discover` · `/join` · `/leave` | – · `{ id }` · `{ id }` | `Conversation[]` · `Conversation` · `{ message }` | Public communities are broadcast; `canPost` is false unless the user has posting rights (RBAC, PRD Module 11) |
| `/chat/messages` | `{ id, after? }` | `ChatMessage[]` oldest → newest | No `after`: latest 50. With `after`: only newer than that message id. App polls every 4 s while a thread is open — replace with push/socket when available |
| `/chat/send` | `{ id, text }` | `ChatMessage` | 403 where posting is not allowed |
| `/chat/read` · `/chat/unread-total` | `{ id }` · – | `{ message }` · `{ count }` | Tab badge refreshes every 15 s |
| `/chat/contacts` · `/chat/dm/start` · `/chat/group/create` | `{ q }` · `{ userId }` · `{ name, memberIds[] }` | `Contact[]` · `Conversation` · `Conversation` | DM start is idempotent; a group needs a name and ≥ 1 member |
| `/chat/report` | `{ messageId, reason }` | `{ message }` | Moderation queue; retention policy is a backend decision |

Types: `src/types/chat.ts`. Service: `src/services/chat-service.ts`.

## Vendor portal & employment (all mocked — `src/services/mock/vendor.mocks.ts`)
| Path | Request | Response | Notes |
|---|---|---|---|
| `/vendor/summary` | – | `{ business, earnings, openOrders, registrations, students, activity[] }` | Requires the vendor role |
| `/vendor/store/toggle` | `{ open }` | `{ open }` | Audited |
| `/vendor/team` | – | `Staff[]` (status: invited · requested · pending_kyc · active) | |
| `/vendor/team/invite` | `{ userId, name, username, module, capabilities[] }` | `Staff` | 403 if any capability is owner-only; 409 if already on the team |
| `/vendor/team/respond` | `{ id, accept }` | `{ message }` | Answers a user's request to join; accepted staff sit in `pending_kyc` until base KYC is approved |
| `/vendor/team/capabilities` | `{ id, capabilities[] }` | `Staff` | Owner-only (payout account, delete, transfer, module off) can never be granted |
| `/vendor/team/revoke` | `{ id }` | `{ message, returnedOrders }` | Open work returns to the owner |
| `/vendor/audit` | `{ cursor? }` | `Page<AuditEntry>` | Every owner and staff action |

Capability keys per module live in `src/features/vendor/lib/capabilities.ts` — the backend should use the same keys. Types: `src/types/vendor.ts`. Service: `src/services/vendor-service.ts`.

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

## Events (`events.mocks.ts`)
| Path | Request | Response | Notes |
|---|---|---|---|
| `/events/get` | `{ id }` | `EventDetail` (+ `myTicket`) | |
| `/events/register` | `{ eventId, paymentRef? }` | `Ticket` | Free events need no payment; 402 if paid event has none; 409 if full or already registered |
| `/events/waitlist/join` | `{ eventId }` | `Ticket` (`waitlisted`, `waitlistPosition`) | FIFO; a freed seat is held 24 h for the first person (claim step not built — needs backend) |
| `/events/ticket` | `{ id }` | `Ticket` | Ticket shows a code; **QR rendering needs a QR library — not added (approval needed)**, organiser enters the code instead of scanning |
| `/events/vendor/list` · `/create` · `/registrations` · `/checkin` | – · `NewEvent` · `{ eventId }` · `{ code }` | `EventItem[]` · `EventItem` · `Ticket[]` · `Ticket` | Check-in: 404 unknown code, 409 already checked in, 403 not valid |

## Coaching (`coaching.mocks.ts`)
| Path | Request | Response | Notes |
|---|---|---|---|
| `/coaching/get` | `{ id }` | `CourseDetail` (course, batches, `enrolledBatchIds`) | |
| `/coaching/enrol` | `{ batchId, paymentRef }` | `Enrolment` | Full batch fee up front, no instalments. The pay screen shows `COACHING_REFUND_POLICY` before payment (scope review #7) |
| `/coaching/enrolment` | `{ id }` | `Enrolment` (`refundable` while the first session has not started, `sessions[]`) | Cancel/refund is Phase 9 |
| `/coaching/vendor/courses` · `/create` · `/batch` · `/attendance` | – · `NewCourse` · `{ batchId }` · `{ batchId, sessionId, presentIds[] }` | `{ batch, courseTitle }[]` · `{ course, batch }` · `BatchRoster` · `{ message }` | |

## PG / hostel (`stays.mocks.ts`)
| Path | Request | Response | Notes |
|---|---|---|---|
| `/stays/search` | `{ q, facilities[], from, to }` | `StayResult[]` | Indexed by location text and facilities (scope review #5); only properties with a free bed for **every** night are returned; 400 for an invalid range |
| `/stays/get` | `{ id, from?, to? }` | `PropertyDetail` (rooms with `free` beds for the range) | |
| `/stays/book` · `/stays/booking` | `{ roomId, from, to, beds, paymentRef }` · `{ id }` | `Booking` | Nights are `[from, to)`; the check-out day is free for the next guest; 409 if beds are no longer free |
| `/stays/vendor/properties` · `/create` · `/room/save` · `/facilities` | – · `NewProperty` · `{ propertyId, room }` · `{ propertyId, facilities[] }` | `Property[]` · `Property` · `Room` · `Property` | Availability is the room's total beds minus bookings |

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

## Delivery partner (`delivery.mocks.ts`)
| Path | Request | Response | Notes |
|---|---|---|---|
| `/delivery/home` | – | `{ stats, active?, waiting[], recent[] }` | App refreshes on focus and every 10 s so new offers appear |
| `/delivery/online` | `{ online }` | `{ online }` | 409 when going offline mid-delivery |
| `/delivery/accept` · `/delivery/pass` | `{ id }` | `DeliveryJob` · `{ message }` | Accept needs the partner online (409) and no active job (409). A ready order creates **one** job, offered to the vendor's own online delivery staff, then a Ruxstar partner, then Shadowfax, one at a time (scope review #14) — the mock only has the partner pool |
| `/delivery/advance` | `{ id, code? }` | `DeliveryJob` | accepted → picked_up; picked_up → delivered needs the customer's 4-digit `deliveryCode` (401 if wrong). Delivering completes the order. Proof-of-delivery photo/QR is a parked decision |
| `/delivery/earnings` | – | `{ today, week, total, items[] }` | Paid from the delivery fee, never the vendor's money |

`PodOrder.deliveryCode` is generated for delivery orders and shown to the customer only while the order is out for delivery. The partner area lives in `features/delivery` + route group `(partner)` and opens only for accounts with the delivery role. It stays in this app; there is no separate delivery app (decided 29 Oct 2026).

Types: `src/types/{commerce,pod,events,coaching,stays,money,delivery}.ts`. Services: `src/services/{commerce,pod,events,coaching,stays}-service.ts`.

Backend gaps still open (not mocked): login attempt counter + 30-min lockout, suspended-vs-disabled status, session/device registration.

Types: `src/types/auth.ts`. Service: `src/services/auth-service.ts`.

## Planned (added to this table as each phase starts)
Sessions & devices · notification preferences · blocked users · KYC (Aadhaar, PAN, face, bank, GST, delivery) · feed, posts, reports · messages/groups/communities · employment · Print-on-demand · Events · Coaching · PG/hostel · ledger/payments/withdrawals.
