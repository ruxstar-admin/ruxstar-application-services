# Decisions

1. **Three repos kept in sync** (replaces "mobile-only changes", 29 Oct 2026). The app leads; a feature is done when the API serves it, the app uses it with its mock off, and the website has the same screens. The API's OpenAPI spec is the one contract. See `Architecture/09-sync-plan.md` in the workspace.
2. **Docs live in `docs/mobile/`** inside this repo so they version with the code.
3. **Plus Jakarta Sans** chosen as the closest free match to District's geometric sans.
4. **Single phone entry for login + signup** (Welcome): `POST /v1/account/otp` with purpose `signup` answering `PHONE_TAKEN` → routes to Login.
5. **SMS-only OTP resend** — backend has no WhatsApp channel.
6. **No "Skip" / guest mode** — District has it; Ruxstar requires an account for every role.
7. **Hero plays `assets/animations/online-shopping.json`** (Lottie, 5 s, one pass, no loop; recoloured to the District-style purple palette) under the Ruxstar wordmark, with a `HeroCaption` that steps through Feed / Print / Events / Stay / Learn once. Reduced motion shows its final frame. It fades and shrinks away as the keyboard opens (`useKeyboardProgress`), matching the District welcome transition.
8. **Sentry for crash reporting** (`@sentry/react-native`), PII off, sensitive keys scrubbed.
9. **Jest (jest-expo)** for pure-logic tests. `@react-native/jest-preset` is pinned to the same
   version as `react-native` — keep them in lockstep when upgrading.
10. **Forgot password is real:** code with purpose `reset`, then `POST /v1/account/password/reset`, which signs out every device. (Was mocked until 29 Oct 2026.)
11. **tsconfig `types: ["jest", "node"]`** — required because TypeScript no longer auto-includes `@types/*`.
12. **Mock any endpoint the backend lacks** (`src/services/mock`, flag `mocked`, env `EXPO_PUBLIC_USE_MOCKS`). Every call is listed in `API_CONTRACTS.md`. The backend team owns the real routes.
13. **Scope = 13 Oct 2026 review.** No creator, general-commerce or restaurant UI; admin web-only; delivery lives in this app (no separate delivery app, 29 Oct 2026). Hero captions are Feed · Print · Events · Stay · Learn.
14. **Theme default (until the user changes it):** purple on near-black, white primary pill button, District-style. Tokens are finalised in Phase 1 and then frozen (changes need user approval).
15. **Tracking system:** `AGENTS.md` (rules), `LOG.md` (work log), `DECISIONS.md`, `API_CONTRACTS.md`, `DELIVERABLES.md`, runtime `createLogger` with redaction.
16. **Signup is one call:** name, date of birth (13+), gender, optional email, username, password and `acceptTerms` all go to `POST /v1/account/signup`, then a one-time success screen (`(customer)/welcome`). The photo step waits for file uploads.
17. **Login uses Password / One-time code tabs** (prototype behaviour); the shaking "Forgot?" link replaces the old "OTP instead" nudge.
18. **Profile data split:** name/phone live in the auth store (from login); everything else comes from `GET /v1/account/me`. Posts, engagements and rating read as zero until the social module ships. Screens load through `useAsyncResource` + `AsyncBoundary`; toggles and removals are optimistic with rollback.
19. **KYC is data-driven:** flows are declarative step lists run by one hook/screen. Vendor and delivery add-ons unlock only after base KYC is verified. Raw ID numbers and photos are never persisted on device or logged.
20. **Lists:** `usePaginated` (cursor, one request in flight) for feed/comments/notifications; `FlatList` only, never `map` in a `ScrollView`; likes/saves are optimistic. Post sheets live in `usePostMenu`, not per screen.
21. **Chat transport is polling** behind `useThread` (4 s focused, 15 s for the tab badge). Swap in sockets/push by changing that hook and `use-messages-unread` only.
22. **Roles stack:** `useAuthStore.roles` authorises access, built from the API's `roles { vendor, delivery, ruxstarStaff, admin }` (the old `customer` / `employee` strings are gone). Every account lands in the user app; the vendor portal (`(vendor)`) and the delivery area (`(partner)`) open only with their role, entered from Profile. CLAUDE.md §6's role→home table is superseded.
23. **One checkout for every module:** `PaymentSheet` (review → method → pay → retry) and `usePaidAction` (pay, then create with the payment reference; a failed create keeps the reference so retry never charges twice). Backend create endpoints must be idempotent on `paymentRef`. Prepaid only, no COD.
24. **Pricing/availability rules live in pure, tested code** (`features/pod/lib/pricing.ts`, `features/stays/lib/availability.ts`, `features/coaching/lib/policy.ts`) and mirror what the server must enforce; the server stays authoritative.
25. **One ledger:** every paid purchase writes a ledger line from its payment reference (`commerce-state.ts` in the mock; the real ledger is the backend's). Vendor net = item total − module commission − vendor-funded discount; delivery fee is never the vendor's. Coupons are validated server-side; prices shown in the app are previews.
26. **Delivery partner is self-contained:** `features/delivery`, `services/delivery-service.ts`, `(partner)` group; nothing else in the app imports from it except the Profile entry. It stays in this app; there is no separate delivery app.
27. **API client (29 Oct 2026):** every call sends `X-Client: app` and `X-App-Version` (from `app.json`), unwraps `{ data }`, and turns `{ error: { code, message, details } }` into `ApiError` with `code`, `details` and `retryAfterSeconds`. Screens branch on `code`, never on text. Lock waits come from `retryAfterSeconds`.
28. **Sessions:** access token (15 min) and refresh token (30 days, single use) live in the secure store (Keychain/Keystore; AsyncStorage only on web). On `UNAUTHENTICATED` the client refreshes once, shared by parallel calls, and retries; a refused refresh signs out.
