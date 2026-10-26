# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Agent & contributor guide (Ruxstar mobile)

Applies to every AI agent and human working in this repo. Keep it short; the detail lives in the files it points to.

## Read order (every session)
1. This file.
2. `CLAUDE.md` — hard rules (file size, no duplication, thin routes, strict TS, haptics, fonts).
3. `docs/mobile/PLAN.md` — the phases and which one is current.
4. `docs/mobile/LOG.md` — newest entries first: what was asked, decided, done, and what is next.
5. `docs/mobile/DECISIONS.md` and `docs/mobile/API_CONTRACTS.md` when touching those areas.

## Scope fence
- **Mobile app only.** Never edit `ruxstar-backend-services` or `ruxstar-frontend-services`. The backend team owns them.
- If an endpoint does not exist, **mock it** (below) and record it in `docs/mobile/API_CONTRACTS.md`. Never build around a missing endpoint silently and never invent a real path.
- Scope is the 13 Oct 2026 scope review: Social, Print-on-demand, Events, Coaching, PG/hostel. Creator routes, general commerce and restaurants are out. Admin and delivery are not in the main app.

## Ask the user before
Adding a dependency · starting a module that is not the current phase · deleting files or assets · changing theme tokens after Phase 1 sign-off · committing or pushing.

## Mock policy
- Handlers live in `src/services/mock/<area>.mocks.ts`, registered with `defineMocks({ 'POST /path': { mocked: true, handle } })`.
- `mocked: true` while the backend route is missing; flip to `false` when it ships. Screens and services never know the difference.
- Mocks throw `ApiError` for failure cases, so error UI is exercised the same way as the real API.
- `EXPO_PUBLIC_USE_MOCKS`: `auto` (default, flagged routes only), `all` (offline demo), `off` (real API only).
- Every mocked or real endpoint the app calls has a row in `docs/mobile/API_CONTRACTS.md`.

## Logging
- Runtime: `createLogger('feature')` from `@/lib/logger`. No `console.*`. Data is redacted automatically (`@/lib/redact`); never log tokens, OTPs, phone numbers or ID numbers anyway.
- Project: add a `docs/mobile/LOG.md` entry at the end of every working session or request (template at the top of that file). Record non-obvious choices as numbered entries in `DECISIONS.md`.

## Definition of done (a change, and a phase)
- `npm run typecheck`, `npx jest`, `npx expo lint` all clean (`npx expo-doctor` before a phase closes).
- Loading, empty, error and offline states exist for any screen that fetches.
- Docs updated in the same change: LOG, API_CONTRACTS (if endpoints), DESIGN_SYSTEM (if tokens/components), PLAN checkbox **only after the user verifies**.
