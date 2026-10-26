# Technical handover

Everything a new developer, QA engineer or the backend team needs. Keep it current; it is part of the delivery terms (see DELIVERABLES.md).

## 1. Run it
```bash
npm install
cp .env.example .env              # EXPO_PUBLIC_API_URL, _APP_SCHEME, _ONESIGNAL_APP_ID, _SENTRY_DSN
npx expo start -c                 # -c clears Metro's cache; always use it after pulling or renaming files
```
Quality gates (all must be green before merging): `npm run typecheck` · `npx jest` · `npx expo lint` · `npx expo-doctor`.
Dev component gallery: open the deep link `<scheme>://gallery` (dev builds only).

## 2. What is real and what is mocked
| Area | Status |
|---|---|
| Signup (phone → OTP → name/password), login (password / OTP), logout | **Real** backend endpoints |
| Forgot password, username, consent, profile, settings, sessions, notification prefs, blocked users, report | **Mocked** |
| Identity / vendor / delivery verification (KYC) | **Mocked** |
| Feed, posts, comments, search, notifications | **Mocked** |
| Messages, groups, communities | **Mocked** (polling transport) |
| Vendor portal, employment, audit log | **Mocked** |
| Print-on-demand, Events, Coaching, PG/hostel | **Mocked** |
| Payments (Cashfree), ledger, payouts, coupons, cancel/refund | **Mocked** |
| Delivery partner | **Mocked** |

The exact request/response of every mocked call is in `API_CONTRACTS.md` — that file is the backend team's build spec.

## 3. Switching a mock to the real backend
1. Build the endpoint to the contract in `API_CONTRACTS.md` (same path or adjust `src/services/*-service.ts` only).
2. In the matching `src/services/mock/<area>.mocks.ts`, set `mocked: false` on that route (or delete the handler).
3. Run the app with `EXPO_PUBLIC_USE_MOCKS=off` to prove nothing still relies on a mock.
4. Update the row in `API_CONTRACTS.md` to `real`, add a LOG entry.

`EXPO_PUBLIC_USE_MOCKS`: `auto` (default — only routes flagged `mocked: true`), `all` (offline demo), `off` (real API only).

## 4. Demo values for QA (mocks only)
| Flow | Value |
|---|---|
| Any mocked OTP (forgot password, Aadhaar) | `123456` is correct; `000000` is "wrong"; five wrong tries → rate limited |
| Taken usernames | `ruxstar`, `admin`, `support`, `priya.nair`, `you.ster` |
| UPI that fails verification | any id ending `@fail` |
| Bank account that fails penny-drop | account number ending `0000` |
| First card payment in a checkout | is declined once so the retry path shows; UPI always succeeds |
| Coupons | `WELCOME50` (Ruxstar-funded, 50 % up to ₹100), `FLEX10` (vendor-funded, 10 % up to ₹200, print only) |
| KYC approval | happens 6 s after submitting (vendor/delivery approval grants the role) |
| Delivery code | shown to the customer on the print-order screen while out for delivery |
| DM replies | the other person replies 1.5 s after you send |

## 5. Build and release (EAS)
Profiles in `eas.json`: `development` (dev client, APK/simulator), `preview` (internal APK), `production` (app bundle / iOS). Secrets: `SENTRY_AUTH_TOKEN`, `EXPO_PUBLIC_SENTRY_DSN`. OneSignal runs in development mode in `app.json` — switch to production as part of the release checklist, not silently.
Release checklist: gates green → `npx expo-doctor` → bump version → `eas build --profile preview` and smoke test every flow in section 4 → `eas build --profile production` → store listing.

## 6. Known gaps and open decisions
- **Dependencies:** 7 Expo packages are one patch behind the SDK (`npx expo install --check`); upgrade needs approval.
- **QR codes:** event tickets show a code; QR rendering/scanning needs a QR library (approval needed). Organisers check people in by typing the code.
- **Offline banner:** needs a connectivity library (`@react-native-community/netinfo`) — not added.
- **Delivery app host:** monorepo vs separate repo is undecided (PLAN D3); `features/delivery` is built to be lifted out.
- **Backend-owned, not in the app:** login lockout, session/device registration, event waitlist 24 h claim, whole-batch cancel refunds, admin force-refund, weekly settlement run, Shadowfax / vendor-staff delivery sources, commission rates (mock values: POD 8 %, Events 10 %, Coaching 12 %, PG 6 %).
- **Parked by the scope review:** delivery radius, offer timer, proof of delivery.
- **Not verified on a device:** every screen was built and checked with typecheck, lint and 150+ unit/mock tests, but has not been run on a phone by the author. Start QA with the flows in section 4.
- **Out of scope by decision:** creator routes, general commerce, restaurants, admin and staff in the app.

## 7. Handover checklist (from the 17 Oct notes)
Source ownership and documentation (this folder) · deployment instructions (section 5) · architecture (ARCHITECTURE.md) · API contract status (section 2 + API_CONTRACTS.md) · decisions (DECISIONS.md) · work history (LOG.md). Warranty, support SLAs and the maintenance proposal are commercial terms tracked in DELIVERABLES.md.
