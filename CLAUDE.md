# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```bash
npx expo start            # Start dev server (scan QR with Expo Go)
npx expo start --web      # Start web only
npx expo run:android      # Build & run on Android device/emulator
npx expo run:ios          # Build & run on iOS simulator
npx expo lint             # Run ESLint (expo lint wraps eslint)
```

No test runner is configured. There is no `npm test` command.

Path alias `@/` maps to `src/` (configured in `tsconfig.json`).

---

## Architecture

### Routing (Expo Router — file-based)

```
src/app/
├── _layout.tsx          ← ROOT: auth guard + store wiring (critical — see below)
├── index.tsx            ← Neutral spinner shown only during cold-start hydration
├── (auth)/              ← Unauthenticated screens (no tabs)
│   ├── welcome.tsx      ← Role selector (customer vs vendor)
│   ├── login.tsx        ← Password or OTP login
│   ├── otp.tsx          ← Shared OTP verify (mode: 'login' | 'signup')
│   └── register/        ← Multi-step signup: index → details → vendor-details
├── (user)/              ← Authenticated customer tab group
└── (vendor)/            ← Authenticated vendor tab group
    └── kyc/             ← Vendor KYC sub-stack (aadhaar → pan → face)
```

### Auth Guard (`src/app/_layout.tsx`) — the most critical file

`AuthGuard` is a renderless component inside `RootLayout`. It controls **all navigation** after app start. The complete redirect decision tree:

1. Waits for `navState?.key` (navigator ready) **AND** `_hasHydrated` (AsyncStorage done).
2. `!isAuthenticated && not in (auth)` → `/(auth)/welcome`
3. `isAuthenticated && not in any named group` → role home *(the cold-start/kill-from-recents case — must exist or the spinner hangs forever)*
4. `isAuthenticated && in (auth)` → role home (post-login redirect)
5. Cross-group corrections (vendor in user group, user in vendor group)

**`_hasHydrated`** is a non-persisted flag in `auth-store` that flips to `true` via `onRehydrateStorage` / `onFinishHydration`. A 3-second safety timeout in `AuthGuard` forces it true if AsyncStorage never fires.

**`setPendingLoginRoute(destination)`** — call this *before* `setAuth()` in login/OTP screens. `AuthGuard` consumes it once with `consumePendingLoginRoute()` so navigation happens in one step without flash. Used to route vendors to KYC if incomplete.

### State Management (Zustand)

| Store | Persisted | Responsibility |
|---|---|---|
| `auth-store.ts` | ✅ `ruxstar_auth` key in AsyncStorage | JWT token, userId, role, phone, `_hasHydrated` flag |
| `user-store.ts` | ❌ in-memory | User profile after login |
| `kyc-store.ts` | ❌ in-memory | KYC status + polling |
| `business-store.ts` | ✅ `ruxstar_vendor_businesses_<userId>` | Vendor business list |

`auth-store` uses `partialize` to persist only: `token`, `userId`, `role`, `phone`, `name`, `isAuthenticated`. `_hasHydrated` is intentionally excluded.

**Session wipe pattern:** `AuthGuard` calls `resetKyc()`, `resetBusiness()`, `clearProfile()` the moment `isAuthenticated` becomes false. Login and OTP screens also call these before `setAuth()` to prevent cross-session data leaks.

### Services (`src/services/`)

- `auth-service.ts` — All `/auth/*` endpoints. Uses a `post<T>()` helper that throws typed errors for 404/409.
- `kyc-service.ts` — All `/vendor/kyc/*` endpoints. Includes `normalizeVendorKycStatus()` which unwraps the `{ kyc: {...} }` backend envelope, and `nextKycStep()` which returns the next incomplete KYC step.
- `vendor-service.ts` — Vendor-specific endpoints.

API base URL: `EXPO_PUBLIC_API_URL` env var or falls back to the production Cloud Run URL (see `src/constants/config.ts`).

### Theme (`src/constants/theme.ts`)

Light-themed CRED-inspired design. Key exports:
- `Brand` — all color tokens. `Brand.primary` = `#7C3AED` (purple). `Brand.bg` = `#FFFFFF`.
- `Spacing` — `{ half:2, one:4, two:8, three:16, four:24, five:32, six:64 }`
- `Radius` — `{ sm:8, md:14, lg:18, xl:24, xxl:32, pill:999 }`
- `Gradients` — pre-composed gradient arrays for `expo-linear-gradient`

### Platform variants

Files ending in `.web.tsx` / `.web.ts` are auto-selected on web by Metro. Used for:
- `Globe3D.web.tsx` — web globe (different library from native)
- `app-tabs.web.tsx` — web tab layout variant
- `use-color-scheme.web.ts` — web color scheme hook

### KYC Flow (vendor only)

After vendor login, `KycService.getStatus(token)` is called. `nextKycStep()` maps the result to one of: `aadhaar` → `pan` → `face` → `pending_review` → `verified` | `rejected`. If any step is incomplete, `setPendingLoginRoute('/(vendor)/kyc')` is set before `setAuth()` so the guard lands there directly.

Deep-link scheme `ruxstarapplicationservices://kyc/` is registered in `app.json` for the DigiLocker Aadhaar callback.

---

## Key conventions

- **Always call `setPendingLoginRoute()` before `setAuth()`** in any screen that logs a user in, otherwise `AuthGuard` will use the role-default destination and may skip KYC.
- **Never add a `<Redirect>` to `index.tsx`** — it fires before AsyncStorage hydration and races with the guard.
- `console.log` calls in `kyc-service.ts` are intentional debug traces; leave them until KYC is stable in production.
- `devOtp` param on the OTP screen is a dev convenience — the backend returns the plaintext OTP in development only; it must never appear in a production build.
- `expo/tsconfig.base` is extended; strict mode is on.
