# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository. Read it in full before writing or editing any code here.

---

## 0. Build order — read this first, every session

`../resources/PRD.md` (relative to this repo: `../resources/PRD.md`, i.e.
`C:\Users\memoa\Projects\Ruxstar\resources\PRD.md`) is the authoritative module checklist,
derived from `resources/ruxstar-business.drawio.pdf`. It is the build order — not this file.

- We build **one module at a time**, in the order listed there, unless the user explicitly says
  to jump ahead. Don't build a later module's screens/routes while an earlier one is still open.
- A module's checkbox in that file is struck **only after the user has verified it** — finishing
  the code is not the same as finishing the module. Don't mark it done yourself.
- Before starting anything, check that file for what's next and what's already
  blocked/deferred (e.g. a module waiting on a backend route that doesn't exist yet).
- If you're about to build something not on the current module's checklist, stop and ask —
  this is exactly the mistake that made this rule necessary in the first place.

---

## 1. What Ruxstar is

Ruxstar is a multi-role local-commerce/services marketplace platform, split across three
repositories:

| Repo | Stack | Role |
|---|---|---|
| `ruxstar-backend-services` | Node.js + Express + MongoDB (native driver), Cloud Run | Single API for every client below |
| `ruxstar-frontend-services` | Next.js (App Router) | Web app: landing, login/signup, admin dashboard, thin customer/business/delivery web views |
| `ruxstar-application-services` (**this repo**) | Expo 57 + Expo Router 57 + React Native 0.86 + TypeScript | The real product: native/web app for the three end-user roles |

**This mobile app must support three distinct authenticated experiences, sharing one auth
flow but branching into three separate route groups and dashboards:**

1. **Customer** (`ROLES.CUSTOMER = 'customer'`) — discovers businesses, books slots, buys
   products (commerce), orders prints (POD), books "creator" offers, registers for events.
2. **Vendor** (`ROLES.VENDOR = 'vendor'`) — runs one or more `Business` documents. A business
   operates under a *module* (booking / commerce / print / creator / events) set in
   `setup.bookingMode` / `setup.printProfile` / `setup.commerceProfile`. Vendors must complete
   KYC (Aadhaar via DigiLocker → PAN → face match) before going live. Managed today via
   `vendor.controller.js`, `vendor.kyc.controller.js`, `business.controller.js`.
3. **Delivery Partner** (`ROLES.DELIVERY = 'delivery'`) — **not yet built** on either backend
   routes or this app (only a placeholder page exists in the Next.js web frontend). When asked
   to build delivery features, treat this as greenfield: mirror the vendor app's structural
   patterns (auth guard branch, its own Zustand store, its own service file, its own route
   group) rather than bolting it onto the customer or vendor flow.

Roles are defined in `ruxstar-backend-services/constants/roles.js`:
`admin`, `vendor`, `employee`, `delivery`, `customer`. `admin` and `employee` are back-office
only — they belong to the Next.js admin dashboard, never to this app.

A user's `roles` array can change (e.g. `becomeVendor` / `becomeCustomer` in `models/User.js`),
so treat role as *current session state* from the JWT/profile, not a fixed identity.

### Domain modules a vendor's business can run
- **Booking** — slot/appointment based (salons, studios, courts). Fields: `pricePerSlot`,
  `slotMinutes`, `bookingMode`, `maxGuests`, `resources`, `staff`, `bufferMinutes`.
- **Commerce** — product catalog + orders (`Product.js`, `CommerceOrder.js`).
- **Print-on-demand (POD)** — customers upload files, vendor shops fulfil them
  (`PrintOrder.js`, `printOrder.service.js`).
- **Creator offers/bookings** — vendors publish bookable "offers", customers book them
  (`CreatorOffer.js`, `CreatorBooking.js`).
- **Events** — ticketed events with registration (`Event.js`, `EventRegistration.js`).

Payments run through **Cashfree** (`react-native-cashfree-pg-sdk`, `payment.service.js`,
`payout.service.js`, `withdrawal.service.js`, `refund.service.js`). Push notifications run
through **OneSignal** (`react-native-onesignal`, `notification.service.js`).

---

## 2. Hard rules for this repo

These are non-negotiable. If a task can't be done within them, stop and say so instead of
breaking them silently.

1. **No file exceeds 1000 lines.** If a screen/service/store is trending past that, split it
   (extract sub-components, hooks, or helper modules) *before* it crosses the line, not after.
   Most files should be far smaller — a 1000-line screen is already a smell; aim for
   150–400 lines for screens, under 150 for hooks/utils.
2. **Feature-based folder structure** (see §3). Don't dump unrelated screens/components into
   one flat folder. Don't create a new top-level folder for a single file.
3. **No duplicate code, anywhere.** This is the single biggest reason the previous codebase got
   thrown out — three near-identical copies of the same form/card/screen across
   customer/vendor/delivery is a failure, not a shortcut. The moment the same logic or markup
   is needed by a second role or screen, extract it — a shared component in `components/ui/`,
   a hook in `hooks/`, a helper in `lib/` — and have both call sites use it. Never
   copy-paste-and-tweak a screen to make a second version of it.
4. **No dead code, no commented-out blocks, no speculative abstractions.** Don't build for a
   hypothetical fourth role or module that hasn't been asked for.
5. **TypeScript strict mode stays on** (`tsconfig.json` already has `"strict": true`). No `any`
   unless interfacing with an untyped third-party module, and then it's isolated to one typed
   wrapper, not spread through the codebase.
6. **Routes in `src/app/` are thin.** A route file imports and renders a screen component from
   `src/features/<feature>/screens/`; it does not contain business logic, layout, or >30 lines.
   This keeps Expo Router file-based routing intact while the real code lives in
   `features/`.
7. **Path alias `@/` → `src/`** (and `@/assets/*` → `assets/`), already configured in
   `tsconfig.json`. Always import through the alias, never deep relative paths like
   `../../../../constants/theme`.
8. **Every animation is deliberate, not decorative filler.** See §5 — use the right tool
   (Reanimated worklet vs. Moti vs. Skia) for the job, keep it on the UI thread, and respect
   `prefersReducedMotion` where the platform exposes it.
9. **Every screen transition uses the same shared pattern.** See §5a — stack pushes, tab
   switches, and modal presents are configured once and reused, never hand-rolled per screen.
10. **This app is built independently of `ruxstar-frontend-services`.** That repo is a
    separate, lower-quality web surface (thin placeholder dashboards, its own React-Three-Fiber
    globe). Do not port its components, copy its folder layout, reuse its visual design, or
    treat it as a reference for how this app should look or be structured. Take direction from
    the user and from this file — not from that codebase.

---

## 3. Folder structure (feature-based, Expo Router compliant)

```
src/
├── app/                          ← Expo Router routes — THIN, re-export screens only
│   ├── _layout.tsx               ← Root layout: AuthGuard + store wiring
│   ├── index.tsx                 ← Cold-start hydration spinner (nothing else — see §6)
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx           ← imports features/auth/screens/WelcomeScreen
│   │   ├── login.tsx
│   │   ├── otp.tsx
│   │   └── register/
│   │       ├── _layout.tsx
│   │       ├── phone.tsx
│   │       ├── details.tsx
│   │       └── vendor-details.tsx
│   ├── (customer)/               ← Customer tab group
│   │   ├── _layout.tsx
│   │   ├── index.tsx             ← Home/Discover
│   │   ├── explore.tsx
│   │   ├── orders.tsx
│   │   └── profile.tsx
│   ├── (vendor)/                 ← Vendor tab group
│   │   ├── _layout.tsx
│   │   ├── dashboard.tsx
│   │   ├── products.tsx
│   │   ├── orders.tsx
│   │   ├── profile.tsx
│   │   └── kyc/
│   │       ├── _layout.tsx
│   │       ├── aadhaar.tsx
│   │       ├── pan.tsx
│   │       └── face.tsx
│   └── (delivery)/               ← Delivery partner tab group (build to mirror (vendor)/)
│       ├── _layout.tsx
│       ├── dashboard.tsx         ← Active/available deliveries
│       ├── history.tsx
│       ├── earnings.tsx
│       └── profile.tsx
│
├── features/                     ← All real logic, grouped by business domain
│   ├── auth/
│   │   ├── screens/               (WelcomeScreen.tsx, LoginScreen.tsx, OtpScreen.tsx, ...)
│   │   ├── components/            (PhoneInput.tsx, OtpInput.tsx, RoleCard.tsx)
│   │   └── hooks/                 (use-otp-timer.ts, use-phone-validation.ts)
│   ├── customer/
│   │   ├── screens/
│   │   ├── components/
│   │   └── hooks/
│   ├── vendor/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── kyc/                   (KYC-specific components + hooks, scoped here)
│   │   └── hooks/
│   └── delivery/                  ← New — mirror vendor/'s internal shape
│       ├── screens/
│       ├── components/
│       └── hooks/
│
├── components/ui/                 ← Cross-feature, logic-free primitives only
│   (PrimaryButton.tsx, InputField.tsx, GradientBackground.tsx, Card.tsx, Sheet.tsx, ...)
│   Promote a component here ONLY when it's used by 2+ features and has zero feature-specific
│   logic. Otherwise it stays inside the feature that owns it.
│
├── stores/                        ← Zustand, one store per domain (see §7)
│   ├── auth-store.ts
│   ├── customer-store.ts
│   ├── vendor-store.ts
│   ├── delivery-store.ts          ← New
│   ├── kyc-store.ts
│   └── business-store.ts
│
├── services/                      ← One file per backend route group, thin API wrappers
│   ├── auth-service.ts            (/auth/*)
│   ├── vendor-service.ts          (/vendor/*)
│   ├── kyc-service.ts             (/vendor/kyc/*)
│   ├── delivery-service.ts        ← New (/delivery/* once backend exists)
│   ├── commerce-service.ts
│   ├── catalog-service.ts
│   └── notification-service.ts
│
├── hooks/                         ← Cross-feature hooks only (e.g. use-color-scheme.ts)
├── lib/                           ← Fetch client, error types, storage helpers
├── constants/                     ← theme.ts, motion.ts, config.ts, countries.ts, roles.ts
└── types/                         ← Shared TS types/interfaces mirroring backend models
```

**Rule of thumb:** if you're about to add a screen, ask "which of the three roles (or auth)
does this belong to?" and put it in that feature folder. If a component/hook is reused across
roles, it goes in the top-level `components/`, `hooks/`, or `stores/` — not duplicated.

---

## 4. Commands

```bash
npx expo start            # Start dev server (scan QR with Expo Go)
npx expo start --web      # Start web only
npx expo run:android      # Build & run on Android device/emulator
npx expo run:ios          # Build & run on iOS simulator
npx expo lint             # Run ESLint (expo lint wraps eslint)
```

`npm test` runs Jest (jest-expo). Put tests in `__tests__/` next to the code; cover pure logic (validators, error mapping) rather than snapshotting screens.

---

## 5. Animation — professional, performant defaults

Stack already installed: `react-native-reanimated 4.5.x`, `react-native-worklets`,
`react-native-gesture-handler ~2.32`. **Moti and React Native Skia are not yet installed** —
add them deliberately when the screen calls for them, per the table below.

| Tool | When to reach for it | Cost |
|---|---|---|
| **Reanimated 4 worklets** (`useSharedValue`, `useAnimatedStyle`, `withSpring`/`withTiming`) | Gesture-driven, interruptible, performance-critical UI animation (button press, sheet drag, list item swipe, tab transitions). Runs on the UI thread, unaffected by JS thread load. | ~1–2 MB, already paid for |
| **Moti** (`moti`, thin declarative wrapper over Reanimated) | Simple mount/unmount and prop-driven transitions (fade/slide/scale a card in, staggered list entrance) where hand-writing `useAnimatedStyle` is pure boilerplate. `from`/`animate`/`exit` props, ~10x less code than raw Reanimated for these cases. | ~30 KB, negligible |
| **React Native Skia** | Custom drawing that CSS-style transforms can't do: shaders, custom charts, image filters, particle/glow effects, map overlays. | ~4–6 MB native binary — only add when a screen genuinely needs canvas-level graphics |

Hero/auth-screen visual treatment (splash art, illustration, whatever replaces a static
background) is **not decided yet** — do not build one speculatively. It'll be specified
separately before those screens are built.

Rules:
- Prefer **Reanimated layout animations** (`entering`/`exiting` props, `LinearTransition`) for
  list/screen enter-exit before reaching for a custom worklet.
- Every animation must run at 60fps on a mid-range Android device — profile with the dev menu's
  perf monitor before calling a screen done, not just on iOS simulator.
- Respect `AccessibilityInfo.isReduceMotionEnabled()` for anything more than a subtle fade —
  fall back to instant or opacity-only transitions.
- Animation lives with the feature that uses it (`features/<feature>/components/`), never in
  `components/ui/` unless it's a generic, parameter-driven primitive (e.g. a reusable
  `<Shimmer />` skeleton).
- Install on demand: `npx expo install moti` / `npx expo install @shopify/react-native-skia`
  only when a task actually needs them — don't pre-install speculatively.

*(Sourced from current React Native animation library comparisons — Reanimated for
gesture/performance-critical UI, Moti as the declarative layer on top of it, Skia for
canvas-level graphics — see f22labs' 9-library comparison and the Reanimated/Moti/Skia
breakdown on DEV Community, 2026.)*

---

## 5a. Navigation & screen-transition animation — one pattern, everywhere

The whole app must feel like one continuous product, not a set of screens each with their own
idea of how to transition. Define the transition rules **once**, centrally, and every route
inherits them — don't set `animation` per screen.

- **Stack transitions** (`(auth)`, `(vendor)/kyc`, any pushed screen): set a single shared
  `screenOptions` on each stack's `_layout.tsx` — e.g. one consistent `animation` value
  (native default `slide_from_right` on iOS/Android via `@react-navigation/native-stack`, which
  Expo Router uses under the hood) and one consistent duration/easing if customized. If a
  screen needs to differ (a modal, a full-screen KYC step), that's an explicit, named exception
  in that stack's `_layout.tsx` — not a one-off inline override buried in the screen file.
- **Tab switches** (`(customer)`, `(vendor)`, `(delivery)` tab groups): one consistent
  cross-fade or platform-native tab transition, configured once in each group's `_layout.tsx`
  Tabs options — identical timing/easing across all three role tab groups so switching feels
  the same regardless of role.
- **Modals / sheets** (OTP resend confirmation, filters, action sheets): one shared modal
  presentation style (e.g. `presentation: 'modal'` with a consistent slide-up), reused via a
  shared layout option or a small `components/ui/AppModal.tsx` wrapper — not five different
  modals each animated by hand.
- **Shared transition tokens**: define timing/easing constants once (e.g.
  `constants/motion.ts` — `Motion.duration.fast/base/slow`, `Motion.easing.standard`) and have
  every screen-transition config and every Reanimated worklet reference them, instead of each
  file inventing its own `300` / `withTiming(..., { duration: 250 })` magic numbers.
- Keep transitions on the native/UI thread (React Navigation's native-stack transitions already
  are; don't replace them with a JS-driven custom transition unless there's a specific reason
  the native one can't do what's needed).

---

## 6. Routing & Auth Guard (rebuild this pattern — it's the backbone)

`AuthGuard`, a renderless component inside `src/app/_layout.tsx`, controls **all** navigation
after app start. Rebuild it with this decision tree (it existed before the code reset and must
be restored before any role screens are usable):

1. Wait for `navState?.key` (navigator ready) **AND** `_hasHydrated` (AsyncStorage restore
   done — with a 3s safety timeout that forces it true if storage never fires).
2. `!isAuthenticated && not in (auth)` → `/(auth)/welcome`.
3. `isAuthenticated && not in any named group` → role-specific home. *(Handles cold start /
   killed-from-recents — must exist or the spinner hangs forever.)*
4. `isAuthenticated && in (auth)` → role-specific home (post-login redirect).
5. Cross-group correction: vendor caught in `(customer)`, customer in `(vendor)`, anyone in
   `(delivery)` without the delivery role, etc. → correct group.

`role → home` mapping: `customer` → `(customer)/index`, `vendor` → `(vendor)/dashboard`,
`delivery` → `(delivery)/dashboard`.

**`setPendingLoginRoute(destination)`** — call before `setAuth()` in any login/OTP screen, so
`AuthGuard` can route a freshly-authenticated user straight to a non-default destination (e.g.
a vendor with incomplete KYC → `(vendor)/kyc`) in one step without a flash of the wrong screen.
`AuthGuard` consumes it once via `consumePendingLoginRoute()`.

Never add a `<Redirect>` to `src/app/index.tsx` — it fires before AsyncStorage hydration and
races with the guard. `index.tsx` should render nothing but a neutral spinner.

---

## 7. State management (Zustand)

One store per domain, persisted only when it must survive app restarts:

| Store | Persisted | Responsibility |
|---|---|---|
| `auth-store.ts` | ✅ `ruxstar_auth` in AsyncStorage | JWT token, userId, role, phone, name, `_hasHydrated` flag |
| `customer-store.ts` | ❌ in-memory | Customer profile after login |
| `vendor-store.ts` | ❌ in-memory | Vendor profile after login |
| `delivery-store.ts` | ❌ in-memory | Delivery partner profile/status after login |
| `kyc-store.ts` | ❌ in-memory | Vendor KYC status + polling |
| `business-store.ts` | ✅ `ruxstar_vendor_businesses_<userId>` | Vendor's business list |

`auth-store` uses `partialize` to persist only `token`, `userId`, `role`, `phone`, `name`,
`isAuthenticated`. `_hasHydrated` is intentionally excluded from persistence — it's a
per-session flag.

**Session wipe pattern:** the moment `isAuthenticated` becomes `false`, `AuthGuard` calls each
domain store's reset (`resetKyc()`, `resetBusiness()`, `clearProfile()`, etc.). Login/OTP
screens also call resets *before* `setAuth()` so no data leaks across a login → logout → login
(different account) sequence.

---

## 8. Services (`src/services/`)

- `auth-service.ts` — all `/auth/*` endpoints, via a shared `post<T>()`/`get<T>()` helper that
  throws typed errors for 404/409 rather than swallowing them.
- `kyc-service.ts` — `/vendor/kyc/*`. Includes `normalizeVendorKycStatus()` (unwraps the
  `{ kyc: {...} }` backend envelope) and `nextKycStep()` (maps status →
  `aadhaar | pan | face | pending_review | verified | rejected`).
- `vendor-service.ts` — vendor/business endpoints.
- `delivery-service.ts` — build against backend delivery routes once they exist; until then,
  stub with typed request/response shapes matching the `delivery` role's expected API so the
  UI can be built against a contract.
- API base URL: `EXPO_PUBLIC_API_URL` env var, falling back to the production Cloud Run URL in
  `src/constants/config.ts`.

---

## 9. KYC flow (vendor only)

After vendor login, `KycService.getStatus(token)` runs. `nextKycStep()` maps the result to
`aadhaar → pan → face → pending_review → verified | rejected`. Any incomplete step sets
`setPendingLoginRoute('/(vendor)/kyc')` before `setAuth()` so the guard lands there directly.

Deep-link scheme `ruxstarapplicationservices://kyc/` is registered in `app.json` for the
DigiLocker Aadhaar callback — do not change this scheme without updating `app.json`'s Android
`intentFilters` and the backend's redirect URL together.

---

## 10. Design system (`src/constants/theme.ts`)

Tokens now live in `src/constants/theme.ts` and are documented in `docs/mobile/DESIGN_SYSTEM.md` (read that, not the stale pre-reset values below).

Pre-reset values, kept for history only (confirm against latest Figma/brand guidance
before treating as final):

```
Brand.primary   #208AEF   (or #7C3AED if following the CRED-inspired variant — confirm which)
Brand.secondary #0D5FA8
Brand.accent    #00D4FF
Vendor gold     #F5A623
Dark surface    #0A0F1E   (auth/login background)
Success         #34C759
Error           #FF3B30

Spacing  { half:2, one:4, two:8, three:16, four:24, five:32, six:64 }
Radius   { sm:8, md:14, lg:18, xl:24, xxl:32, pill:999 }

Typography: Display 32/Bold · Title 24/SemiBold · Body 16/Regular · Caption 13/Regular
```

Export gradients as pre-composed arrays for `expo-linear-gradient` rather than inlining color
stops in each screen.

---

## 11. Key conventions & gotchas

- **Always call `setPendingLoginRoute()` before `setAuth()`** in any screen that logs a user
  in — otherwise `AuthGuard` uses the role-default destination and can skip a required step
  (KYC, onboarding).
- **Never add a `<Redirect>` to `index.tsx`** (see §6).
- `devOtp` on the OTP screen is a dev convenience only — the backend returns the plaintext OTP
  in development mode; it must never appear in a production build. Gate it on `__DEV__` or
  `APP_ENV !== 'production'`.
- Platform variants: files ending `.web.tsx`/`.web.ts` are auto-selected on web by Metro — use
  this for any screen/component that needs a different implementation on web vs. native.
- `expo/tsconfig.base` is extended; strict mode is on — keep it on.
- Payment flows go through Cashfree's SDK, not a custom checkout — check
  `react-native-cashfree-pg-sdk` docs before touching payment screens.
- Push notification device registration goes through OneSignal (`onesignal-expo-plugin` is
  already configured in `app.json`, mode: development — switch to production mode as part of
  the release build checklist, not silently).

---

## 12. Sources

- [I Tested 9 React Native Animation Libraries — f22labs](https://www.f22labs.com/blogs/9-best-react-native-animation-libraries/)
- [Reanimated vs Moti vs Skia — DEV Community](https://dev.to/hugo_rus_630dd942fcf7cc62/reanimated-vs-moti-vs-skia-which-react-native-animation-library-should-you-actually-use-2j7m)
- [Best Folder Structure for Expo & React Native Apps — Medium](https://medium.com/@engin.bolat/best-folder-structure-for-expo-react-native-apps-official-recommendations-real-world-ef91722f1241)
- [How to organize Expo app folder structure — Expo blog](https://expo.dev/blog/expo-app-folder-structure-best-practices)
- [Designing a Scalable React Native + Expo Router Folder Structure — DEV Community](https://dev.to/sachinrupani/designing-a-scalable-react-native-expo-router-folder-structure-3dnj)

---

## 13. Scope & docs

- **Mobile app only.** Never edit `ruxstar-backend-services` or `ruxstar-frontend-services`
  from mobile work; report API mismatches instead.
- Developer docs: `docs/mobile/` (architecture, design system, history, decisions). Update them
  in the same commit as any change they describe.
- Never use `fontWeight` with the Plus Jakarta Sans families — use `Typography.*` / `Fonts.*`.
- Haptics go through `Feedback` (`src/lib/haptics.ts`), never `expo-haptics` directly.
