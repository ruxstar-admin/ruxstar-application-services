# Architecture

- **Stack:** Expo SDK 57, Expo Router (file-based), React Native, TypeScript strict, Zustand, Reanimated 4.
- **Routes** (`src/app/`) are thin: they only render a screen from `src/features/<feature>/screens/`.
- **Features** (`src/features/{auth,customer,vendor,delivery}/`) own screens, components and hooks.
  Auth is built; the role features are placeholders.
- **Shared UI** (`src/components/ui/`): logic-free primitives used by 2+ features.
  Currently `PrimaryButton`, `InputField`, `Chip`, `TextLink`, `ScreenHeader`, `PlaceholderScreen`.
- **Auth shell** (`features/auth/components/AuthFormLayout.tsx`): every pushed auth screen
  (login, OTP, register) uses it — do not hand-roll a new screen shell.
- **Auth guard:** `AuthGuard` in `src/app/_layout.tsx` controls all navigation (see CLAUDE.md §6).
  Never add `<Redirect>` to `src/app/index.tsx`.
- **Services** (`src/services/`) mirror backend route groups 1:1; no invented endpoints.
  The backend sends OTPs by SMS only, so the OTP screen offers SMS resend only (no WhatsApp).
- **State:** one Zustand store per domain; only `auth-store` is persisted.

## Error handling (auth)
- `lib/api-client.ts` — 15 s timeout; failures become `ApiError` with a `kind`
  (`network`, `timeout`, `validation`, `unauthorized`, `forbidden`, `not_found`, `conflict`,
  `rate_limited`, `server`). Screens never read `err.message` or `err.status`.
- `features/auth/lib/auth-errors.ts` — `toAuthError(err, action)` → friendly copy + `target`
  (`mobile` | `password` | `otp` | `form`) + `retryable`. Add new copy here only.
- `features/auth/hooks/use-auth-request.ts` — every auth call goes through `run(action, task, onError?)`:
  blocks double-taps, tracks loading, fires the error haptic, reports real bugs to Sentry.
- `features/auth/lib/validators.ts` — mobile (10 digits, starts 6–9) and password rules.
- UI: field errors render inside `FieldFrame` (reserved line, shake, red border); form-level
  errors use `ErrorBanner` (with Retry for transient failures).
- Backend limitation: wrong password and unknown number both return `401 invalid credentials`, so
  the copy is "Incorrect mobile number or password." Real lockout / forgot-password need backend work
  (Forgot password is intentionally hidden until then).

## Monitoring
`lib/monitoring.ts` wraps Sentry. It is a no-op without `EXPO_PUBLIC_SENTRY_DSN`, disabled in
`__DEV__`, scrubs passwords/OTPs/tokens/phone numbers, and only reports `server`/`unknown`
failures (not wrong passwords or offline users). For release builds set EAS secrets
`SENTRY_AUTH_TOKEN` (source-map upload) and `EXPO_PUBLIC_SENTRY_DSN`.
