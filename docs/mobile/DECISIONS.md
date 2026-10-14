# Decisions

1. **Mobile-only changes.** Backend/web are never edited from this repo's work.
2. **Docs live in `docs/mobile/`** inside this repo so they version with the code.
3. **Plus Jakarta Sans** chosen as the closest free match to District's geometric sans.
4. **Single phone entry for login + signup** (Welcome): `signup/send-otp` 409 → routes to Login.
5. **SMS-only OTP resend** — backend has no WhatsApp channel.
6. **No "Skip" / guest mode** — District has it; Ruxstar requires an account for every role.
7. **Hero is brand-only** (logo + rotating category label) until real illustration assets exist.
8. **Sentry for crash reporting** (`@sentry/react-native`), PII off, sensitive keys scrubbed.
9. **Jest (jest-expo)** for pure-logic tests. `@react-native/jest-preset` is pinned to the same
   version as `react-native` — keep them in lockstep when upgrading.
10. **Forgot password is hidden** until the backend provides a reset flow.
11. **tsconfig `types: ["jest", "node"]`** — required because TypeScript no longer auto-includes `@types/*`.
