# Decisions

1. **Mobile-only changes.** Backend/web are never edited from this repo's work.
2. **Docs live in `docs/mobile/`** inside this repo so they version with the code.
3. **Plus Jakarta Sans** chosen as the closest free match to District's geometric sans.
4. **Single phone entry for login + signup** (Welcome): `signup/send-otp` 409 → routes to Login.
5. **SMS-only OTP resend** — backend has no WhatsApp channel.
6. **No "Skip" / guest mode** — District has it; Ruxstar requires an account for every role.
7. **Hero plays `assets/animations/online-shopping.json`** (Lottie, 5 s, one pass, no loop; recoloured to the District-style purple palette) under the Ruxstar wordmark, with a `HeroCaption` that steps through Feed / Print / Events / Stay / Learn once. Reduced motion shows its final frame. It fades and shrinks away as the keyboard opens (`useKeyboardProgress`), matching the District welcome transition.
8. **Sentry for crash reporting** (`@sentry/react-native`), PII off, sensitive keys scrubbed.
9. **Jest (jest-expo)** for pure-logic tests. `@react-native/jest-preset` is pinned to the same
   version as `react-native` — keep them in lockstep when upgrading.
10. **Forgot password is built against mocks** (`/auth/forgot-password/*`) so the flow is reviewable; the backend team implements the real routes (contract in API_CONTRACTS.md).
11. **tsconfig `types: ["jest", "node"]`** — required because TypeScript no longer auto-includes `@types/*`.
12. **Mock any endpoint the backend lacks** (`src/services/mock`, flag `mocked`, env `EXPO_PUBLIC_USE_MOCKS`). Every call is listed in `API_CONTRACTS.md`. The backend team owns the real routes.
13. **Scope = 13 Oct 2026 review.** No creator, general-commerce or restaurant UI; admin web-only; delivery is a separate app. Hero captions are Feed · Print · Events · Stay · Learn.
14. **Theme default (until the user changes it):** purple on near-black, white primary pill button, District-style. Tokens are finalised in Phase 1 and then frozen (changes need user approval).
15. **Tracking system:** `AGENTS.md` (rules), `LOG.md` (work log), `DECISIONS.md`, `API_CONTRACTS.md`, `DELIVERABLES.md`, runtime `createLogger` with redaction.
16. **Signup collects username + consent before `setAuth`**, saves them with mocked account endpoints after the account is created; a failed save is logged and never blocks signup.
17. **Login uses Password / One-time code tabs** (prototype behaviour); the shaking "Forgot?" link replaces the old "OTP instead" nudge.
18. **Profile data split:** name/phone live in the auth store (from login); everything else comes from `/profile/me`. Screens load through `useAsyncResource` + `AsyncBoundary`; toggles and removals are optimistic with rollback.
19. **KYC is data-driven:** flows are declarative step lists run by one hook/screen. Vendor and delivery add-ons unlock only after base KYC is verified. Raw ID numbers and photos are never persisted on device or logged.
20. **Lists:** `usePaginated` (cursor, one request in flight) for feed/comments/notifications; `FlatList` only, never `map` in a `ScrollView`; likes/saves are optimistic. Post sheets live in `usePostMenu`, not per screen.
21. **Chat transport is polling** behind `useThread` (4 s focused, 15 s for the tab badge). Swap in sockets/push by changing that hook and `use-messages-unread` only.
22. **Roles stack:** `useAuthStore.roles` authorises access. Every account lands in the user app; the vendor portal (`(vendor)`) opens only for accounts with the vendor role, entered from Profile. The delivery partner is a separate app, so no `(delivery)` group exists here. CLAUDE.md §6's role→home table is superseded.
23. **One checkout for every module:** `PaymentSheet` (review → method → pay → retry) and `usePaidAction` (pay, then create with the payment reference; a failed create keeps the reference so retry never charges twice). Backend create endpoints must be idempotent on `paymentRef`. Prepaid only, no COD.
24. **Pricing/availability rules live in pure, tested code** (`features/pod/lib/pricing.ts`, `features/stays/lib/availability.ts`, `features/coaching/lib/policy.ts`) and mirror what the server must enforce; the server stays authoritative.
25. **One ledger:** every paid purchase writes a ledger line from its payment reference (`commerce-state.ts` in the mock; the real ledger is the backend's). Vendor net = item total − module commission − vendor-funded discount; delivery fee is never the vendor's. Coupons are validated server-side; prices shown in the app are previews.
26. **Delivery partner is self-contained and movable:** `features/delivery`, `services/delivery-service.ts`, `(partner)` group; nothing else in the app imports from it except the Profile entry. When the separate delivery app exists, move those and share theme/api-client/auth.
