# Architecture

Stack: Expo SDK 57 · Expo Router (file-based) · React Native 0.86 · TypeScript strict · Zustand · Reanimated 4 · expo-image · Lottie.

## Folder map
```
src/
├── app/                       Routes — thin: render one screen from features/
│   ├── (auth)/                welcome, login, otp, register, forgot/reset password, gallery (dev only)
│   ├── (customer)/            Stack: (tabs) shell + pushed screens
│   │   ├── (tabs)/            Feed · Discover · Search · Messages · Profile
│   │   └── settings/ chat/ pod/ events/ coaching/ stays/ kyc/ post/ user/ …
│   ├── (vendor)/              Vendor portal — only with the vendor role
│   └── (partner)/             Delivery partner area — only with the delivery role (movable, see DECISIONS #26)
├── features/<feature>/        screens/ components/ hooks/ lib/ — all real UI and rules
│   auth · profile · kyc · social · chat · vendor · discover · payments · money
│   pod · events · coaching · stays · delivery · moderation · design
├── components/ui/             Logic-free primitives used by 2+ features (kit listed in DESIGN_SYSTEM.md)
├── services/                  One thin API wrapper per backend area (+ services/mock/)
├── stores/                    Zustand: auth (persisted), feed (dirty flag)
├── hooks/                     Cross-feature hooks (async resource, pagination, focus refetch, auth token…)
├── lib/                       api-client, errors, logger, redact, monitoring, haptics, dates, time, money
├── constants/                 theme, motion, config, roles
└── types/                     Shared TypeScript types per domain
```

## How a request flows
`screen → service (src/services/*-service.ts) → lib/api-client → findMock()?`
- `api-client` asks the mock registry first. If the route is registered **and** flagged `mocked: true` (or `EXPO_PUBLIC_USE_MOCKS=all`), the mock answers; otherwise the real API is called. Screens and services never know which.
- Failures become `ApiError` with a `kind` (`network`, `timeout`, `validation`, `unauthorized`, `forbidden`, `not_found`, `conflict`, `rate_limited`, `server`). Screens never read `err.message`; copy lives next to the feature (`auth-errors.ts`, `kyc-errors.ts`, per-screen helpers).
- Every call is logged through `createLogger('api')` with redaction (`lib/redact.ts`).

## Navigation and access
- `AuthGuard` (`src/app/_layout.tsx`) is the only place that redirects. Signed-out → `(auth)/welcome`; signed-in → `(customer)/(tabs)`.
- Roles stack on one account: `useAuthStore.roles` authorises `(vendor)` and `(partner)`; both are entered from Profile. Never add `<Redirect>` to `src/app/index.tsx`.
- Transitions come from three shared tokens: `STACK_SCREEN_OPTIONS`, `TAB_SCREEN_OPTIONS`, and `BottomSheet` (all in `constants/motion.ts` / `components/ui`).

## Data patterns (use these, do not hand-roll)
| Need | Use |
|---|---|
| Load one resource with loading/error/retry | `useAsyncResource` + `AsyncBoundary` |
| Endless lists | `usePaginated` + `FlatList` |
| Refresh when a screen regains focus | `useRefetchOnFocus` |
| Pay then create (never double charge) | `PaymentSheet` + `usePaidAction` |
| Optimistic toggle with rollback | set state first, call the service, restore in `catch` |
| Confirm a destructive action | `ConfirmSheet` |

## Money and rules in pure code (all tested)
`features/money/lib/rules.ts` (commission, vendor net, coupons, pending window, refunds), `features/pod/lib/pricing.ts`, `features/stays/lib/availability.ts`, `features/coaching/lib/policy.ts`, `features/chat/lib/merge-messages.ts`. They mirror what the backend must enforce; the server stays authoritative.

## Monitoring and logging
`lib/monitoring.ts` wraps Sentry (no-op without `EXPO_PUBLIC_SENTRY_DSN`, off in `__DEV__`, redacts sensitive keys, reports only `server`/`unknown` failures). `lib/logger.ts` is the only logging API; debug output is dev-only and info+ become breadcrumbs. Release builds need EAS secrets `SENTRY_AUTH_TOKEN` and `EXPO_PUBLIC_SENTRY_DSN`.

## Mock layer
Handlers live in `src/services/mock/<area>.mocks.ts`, keyed `'POST /path'` with a `mocked` flag. Shared in-memory state for purchases, payments, the ledger and payouts is in `commerce-state.ts`. See AGENTS.md for the policy and `API_CONTRACTS.md` for every endpoint.
