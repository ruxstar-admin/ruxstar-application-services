# Work log

Append-only, **newest first**. One entry per working session or request. Decisions that outlive the
session also get a numbered line in [DECISIONS.md](./DECISIONS.md).

```
## YYYY-MM-DD — <short title>
Prompt:    what the user asked, in their words
Decision:  what was chosen and why (DECISIONS #n)
Done:      files / screens
Blocked:   what is missing or waiting on someone
Mocks:     endpoints mocked this session (and in API_CONTRACTS.md)
Verified by user: yes / no
Next:      one line
```

---

## 2026-10-22 — Welcome: star-portal backdrop and bottom gap
Prompt:    "add this image as the background in the first page and also bottom side it was showing some gap for the overlay of mobile number enter area below the continue button please fix that"
Decision:  Artwork (`assets/images/Futuristic Gold and Cyan Star Portal.png`) replaces the Lottie hero as the full-screen backdrop; wordmark and rotating caption stay on top. Sheet now runs to the screen edge and pads itself by the bottom safe-area inset instead of the screen reserving that strip.
Done:      `WelcomeScreen.tsx`, `AuthHero.tsx`, new `src/types/assets.d.ts` (png module typing).
Blocked:   Art is gold/cyan while the theme is purple — needs your call. `online-shopping.json` and `Gradients.authBackdrop` are now unused; left in place until you approve deleting them.
Mocks:     none.
Verified by user: no
Next:      Reload with `npx expo start -c` and check the sheet bottom and caption position.

---

## 2026-10-22 — Phase 11: Hardening & handover
Prompt:    "please start all of them one by one" (final phase).
Decision:  Without a device, hardening is what can be proven in code and tooling: accessibility audit, dependency health, docs. Anything needing a phone or a new library is listed as a known gap rather than guessed (HANDOVER §6).
Done:      Accessibility audit of every `Pressable`/`TextInput` (clean); `expo-doctor` / `expo install --check` run (only 7 patch-version lags, not upgraded without approval); `ARCHITECTURE.md` rewritten to the real structure; new `HANDOVER.md` (run, release, real-vs-mocked, mock switch-over, QA demo values, known gaps); `.env.example`; PLAN statuses; final gates: typecheck, lint and 156 tests green.
Blocked:   On-device performance/accessibility pass, offline banner (needs netinfo), QR tickets (needs a QR library), EAS preview build + smoke test, store assets — all need you or a device.
Verified by user: no
Next:      You run the app (`npx expo start -c`), work through HANDOVER §4, and tell me what to fix; then answer PLAN §7 (theme, hero illustration, delivery app host, paid-scope document).

## 2026-10-22 — Phase 10: Delivery partner
Prompt:    "please start all of them one by one" (continuing).
Decision:  Delivery is a separate app (scope review #3) and the monorepo-vs-separate-repo choice (PLAN D3) is still open, so it is built as a self-contained `features/delivery` + `(partner)` route group, role-gated and entered from Profile, so it can be lifted into its own app unchanged (DECISIONS #26).
Done:      Partner home (duty switch, earned today / drops / online time, active job, recent drops), Jobs (offers: accept / pass, one active job, online only), Active delivery (pick up → complete with the customer's 4-digit code), Earnings; print orders now create a delivery job when ready and the customer sees the delivery code while it is out for delivery; delivering completes the order; delivery role granted on verification approval; 2 new tests (156 total).
Blocked:   Partner login screen / separate app shell, navigation (Google Maps), push for new offers, Shadowfax and vendor-staff offer sources, proof of delivery (parked), delivery radius and offer timer (parked).
Mocks:     all `/delivery/*`.
Verified by user: no
Next:      Phase 11 hardening and handover.

## 2026-10-22 — Phase 9: Money
Prompt:    "please start all of them one by one" (continuing).
Decision:  Money rules are pure, tested functions (`features/money/lib/rules.ts`): commission, vendor net, coupon discount, the pending window, refund eligibility. Mock state for purchases, payments, the ledger and payouts moved to `commerce-state.ts` so every module feeds one ledger (DECISIONS #25). Coupon validation is server-side; the app only previews.
Done:      Coupon field in the shared `PaymentSheet` (Ruxstar vs vendor funded, never discounts delivery); `CancelOrder` on POD tracking, tickets, enrolments and stays (quote → confirm → refund); vendor Earnings (withdrawable / pending / withdrawn, paged ledger with commission lines), Withdraw (verified bank or UPI, min ₹100), Coupons (create / switch off); dashboard earnings now come from the ledger; 19 new tests (154 total).
Blocked:   Real Cashfree SDK and webhooks, the weekly settlement job, whole-batch cancel and admin force-refund (backend/web), vendor-initiated cancel, event waitlist promotion on cancel.
Mocks:     `/vendor/earnings`, `/vendor/ledger`, `/payouts/*`, `/coupons/validate`, `/vendor/coupons*`, `/orders/cancel*`; `/payments/start` extended.
Verified by user: no
Next:      Phase 10 Delivery partner.

## 2026-10-22 — Phase 8: Business modules (Print-on-demand, Events, Coaching, PG/hostel)
Prompt:    "please start all of them one by one" (continuing).
Decision:  Shared pieces first, then one module at a time: `PaymentSheet` + `usePaidAction` (pay → create, retry never double-charges), `Discover` tab and "Orders & bookings" over a single `Engagement` model, `StatusTimeline`, `Stepper`, `DayPicker`/`TimePicker`, `MultiChoiceChips`. Each module's pure rules live in `features/<module>/lib` with tests (DECISIONS #23–#24).
Done:      **POD** (upload → settings → pickup/delivery → live price → pay → tracking; vendor order queue), **Events** (browse, free/paid register, waitlist, ticket code, organiser create / registrations / check-in), **Coaching** (course + batches, pay screen with refund policy, enrolment with sessions, vendor create / roster / attendance), **PG** (search by location + facilities + dates, free-bed availability per night, booking; vendor property / rooms / beds / facilities). Search results now open the real detail screens. 41 new tests (135 total).
Blocked:   QR rendering/scanning (needs a QR dependency — approval needed); event waitlist 24 h claim; delivery handoff UI for modules where admin has delivery on (Phase 10); cancel/refund and the ledger (Phase 9); vendor "Book/Order" actions on feed posts.
Mocks:     `/payments/*`, `/orders/list`, `/discover/list`, `/pod/*`, `/events/*`, `/coaching/*`, `/stays/*`.
Verified by user: no
Next:      Phase 9 Money.

## 2026-10-22 — Phase 7: Vendor portal & employment
Prompt:    "please start all of them one by one" (continuing).
Decision:  Roles stack on one account (scope review #4): the auth store holds `roles[]`, everyone lands in the user app and a vendor enters the portal from Profile; `(delivery)` placeholder group removed because delivery is a separate app (DECISIONS #22). Owner-only actions are modelled as non-grantable and shown locked.
Done:      Vendor dashboard (store switch, earnings, counts, recent activity), Team (join requests, staff list, invite with permission picker, per-person permissions, revoke with open-work-returns-to-owner), Audit log (paged), role gating in AuthGuard, vendor role granted locally when vendor verification is approved, `formatRupees`; 10 new tests.
Blocked:   Per-module vendor screens (orders, events…) arrive with Phase 8; delivery-staff employment waits for Phase 10; admin view/suspend of employment is web-only.
Mocks:     all `/vendor/*`.
Verified by user: no
Next:      Phase 8 Business modules (Print-on-demand first).

## 2026-10-22 — Phase 6: Messages, groups, communities
Prompt:    "please start all of them one by one" (continuing).
Decision:  Polling transport (4 s while a thread is focused) isolated in `useThread`; sending is optimistic with a retry on failure; merge rules are pure functions with tests (DECISIONS #21).
Done:      Messages tab (Chats / Groups / Communities, unread badges, discover + join), Thread (inverted list, bubbles, composer, report by long-press, broadcast notice where posting is not allowed), New chat (direct search + group creation), tab unread badge, `useRefetchOnFocus` shared with the verification hub; 12 new tests.
Blocked:   Real-time transport, group member management/admin roles, events-from-community, and message retention need backend decisions.
Mocks:     all `/chat/*`; DMs auto-reply 1.5 s after you send so polling can be seen.
Verified by user: no
Next:      Phase 7 Vendor portal & employment.

## 2026-10-22 — Phase 5: Social (feed, posts, search, notifications)
Prompt:    "please start all of them one by one" (continuing).
Decision:  Cursor pagination through one `usePaginated` hook; optimistic like/save/edit with rollback; one `usePostMenu` hook owns the "…" menu, report, block and delete sheets so Feed and Post detail share them (DECISIONS #20). `ReportSheet` generalised to people and posts.
Done:      Feed (virtualised list, pull-to-refresh, endless scroll, skeleton/empty/error, FAB, unread bell), Post card (photos, like/comment/share/save, store tag), Create/Edit post, Post detail with paged comments and composer, Search (5 scopes, debounced), Notifications (employment Accept/Decline, unread dots); social mocks + 14 new tests.
Blocked:   "Book ₹…"/"Order ₹…" actions on business posts wait for the modules (Phase 8); module search results are not tappable until their detail screens exist; image upload needs a real endpoint.
Mocks:     all `/feed`, `/posts/*`, `/search`, `/notifications/*`.
Verified by user: no
Next:      Phase 6 Messages, groups, communities.

## 2026-10-22 — Phase 4: Identity verification
Prompt:    "please start all of them one by one" (continuing).
Decision:  One step engine drives all three flows (`features/kyc/lib/flows.ts` = data; `useKycFlow` = behaviour). Answers stay in memory only and sensitive numbers show as "ending 1234" (DECISIONS #19).
Done:      Base flow (Aadhaar → OTP → PAN photo → selfie → bank → review → submit), vendor flow (GST/licence → shop photo → review), delivery flow (licence photo → number → vehicle/RC → review); Settings → Verification hub with status badges and prerequisite gating; entry from Profile → Business tab; camera/gallery with denied-permission handling; kyc validators + mock tests.
Blocked:   Real DigiLocker redirect, multipart upload, admin approval queue, and the delivery partner app (Phase 10).
Mocks:     all `/kyc/*` endpoints; approval auto-happens 6 s after submit.
Verified by user: no
Next:      Phase 5 Social.

## 2026-10-22 — Phase 3: Profile & settings
Prompt:    "please start all of them one by one" (continuing).
Decision:  Customer routes now = Stack `(customer)` containing the `(tabs)` shell plus pushed screens (settings, edit profile, user/[id]). Name and phone stay in the auth store; the profile API supplies the rest. One `AsyncBoundary` renders every loading/error state; optimistic updates with rollback for toggles, unblock and end-session (DECISIONS #18).
Done:      Profile tab (stats, badges, Personal/Business tabs, Edit profile), Edit profile (photo picker, username check, private info), Settings → Sessions & devices, Notification preferences, Blocked users, Account & data (export/pause/delete with confirm), other user's profile with Message/Report, `ReportSheet` (reason → thanks → also block), shared `ScreenContainer`, `AsyncBoundary`, `ConfirmSheet`, `useAsyncResource`.
Blocked:   Posts grid and Business tab are empty states until Phases 5 and 7; "Visit store" waits for Phase 8.
Mocks:     profile, sessions, notification prefs, blocked, block/unblock/report, export/pause/delete (see API_CONTRACTS).
Verified by user: no
Next:      Phase 4 identity verification.

## 2026-10-22 — Phase 2: Auth
Prompt:    "please start all of them one by one".
Decision:  Work through the phases in order (PLAN.md), each ending with typecheck + lint + tests green (DECISIONS #16–#17).
Done:      Login Password/OTP tabs + Forgot?; Forgot password → OTP (reset mode) → Reset password; Register adds username (live availability) + consent checkbox; shared `PasswordFields`, `Checkbox`, `UsernameField`; mock layer first use (`auth.mocks.ts`); 45 tests.
Blocked:   Terms/Privacy links are placeholders (no pages yet); lockout and device registration need backend.
Mocks:     forgot-password ×3, username check/set, consent.
Verified by user: no
Next:      Phase 3 Profile & settings.

## 2026-10-22 — Plan approved to start; Phase 0 and Phase 1
Prompt:    "give me the whole plan with phases … don't touch the backend … mock missing endpoints … maintain a log system and agents.md" then "please start the phase one".
Decision:  Plan written as `docs/mobile/PLAN.md` from the prototype recording, the 13 Oct scope review and the commercial notes. Phase 0 (tracking, mock layer, logger) done before Phase 1 because every later phase depends on it. Theme and hero-caption defaults from PLAN §3 are used until the user says otherwise (DECISIONS #12–#14).
Done:      `AGENTS.md`, `LOG.md`, `API_CONTRACTS.md`, `DELIVERABLES.md`; `src/lib/{redact,logger}.ts`; `src/services/mock/registry.ts`; api-client routes through mocks and logs; tests for redact and the mock registry; PRD and CLAUDE.md reconciled to the 13 Oct scope.
Blocked:   Paid-scope document for Print-on-demand / Coaching / Events (needed for DELIVERABLES.md); open questions in PLAN §7.
Mocks:     none yet (first mocks arrive with Phase 2).
Verified by user: no
Phase 1 done (pending your sign-off): purple theme tokens + white primary button; UI kit (BottomSheet, ListRow, ToggleRow, SegmentedTabs, Avatar, Badge, Skeleton, EmptyState); shared TAB_SCREEN_OPTIONS and the customer tab shell (Feed/Discover/Search/Messages/Profile placeholders); dev gallery at `<scheme>://gallery`; hero captions Feed/Print/Events/Stay/Learn.
Not done:  Welcome-page polish beyond the hero/backdrop is unverified on device; no commit made (not asked).
Next:      You review the gallery + welcome on a device and answer PLAN §7; then Phase 2 (Auth).

## 2026-10-15 — Welcome hero animation
Prompt:    District-style welcome hero with a Lottie, purple theme, caption words changing (Events, Bookings …), play once, curved sheet corners.
Decision:  Lottie played once under the wordmark, recoloured to purple; full-screen purple backdrop behind the sheet so its rounded corners show; rotating caption (DECISIONS #7).
Done:      `AuthHero`, `HeroCaption`, `use-keyboard-progress`, `assets/animations/online-shopping.json`, backdrop gradient.
Blocked:   Shopping/Creators captions conflict with the scope review — fixed 2026-10-22.
Verified by user: partly (stale-bundle crash caused by mid-edit reload; reload with `npx expo start -c`).
Next:      Phase plan.
