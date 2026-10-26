# Design system

Source of truth: `src/constants/theme.ts`, `motion.ts`, `src/lib/haptics.ts`.

## Tokens
- **Colour:** `Brand` — purple on near-black (District-style). `bg` #0D0C12, `surface` #15141B, `surfaceAlt`,
  `border`; accent `primary` #B45CF2 / `primarySoft` / `primaryDeep`; **primary button is white** (`action` / `onAction`).
  Status: `success`, `warning`, `error`. Disabled buttons are grey (`disabled` / `disabledText`). Tokens are frozen after Phase 1 sign-off.
- **Spacing / Radius:** `Spacing`, `Radius` (pill buttons, 32px sheet corners).
- **Font:** Plus Jakarta Sans, loaded in `src/app/_layout.tsx`. Each weight is its own family
  (`Fonts.regular|medium|semibold|bold`). **Never use `fontWeight`** with these — use `Typography.*`.
- **Typography:** `display`, `title`, `heading`, `body`, `bodyStrong`, `caption`, `overline`.

## Haptics (`Feedback` in `src/lib/haptics.ts`)
Screens must never import `expo-haptics` directly.

| Name | Use |
|---|---|
| `tap` | Every button / chip press (built into `PrimaryButton`, `Chip`) |
| `press` | Heavier commit actions |
| `select` | Moving between options, OTP cell advance, link presses |
| `success` | Verified OTP, login/signup complete |
| `error` | Failed request, wrong OTP (OTP cells also shake) |

## Motion
Durations/easings from `Motion` in `src/constants/motion.ts`. Stack transitions use
`STACK_SCREEN_OPTIONS` once per layout. Entrances use Reanimated `FadeIn*`; press feedback is a
spring scale on the UI thread.

## Reference
District app screenshots: `../../../resources/WhatsApp Image 2026-09-04 *.jpeg`.

## Keyboard & nudges (auth forms)
- `AuthFormLayout` scrolls to the end whenever the keyboard opens, so the primary button is visible
  right under the focused field. A screen can also pass `scrollRef` to scroll when a later field
  gains focus (Login does this for the password field).
- Login nudge: the "Log in with OTP instead" link sits centered right under the Log in button. After 2 wrong passwords in a row it shakes (`TextLink`'s `attentionKey`) to draw the eye. No toast.

## Shared components (`src/components/ui`)
`PrimaryButton` (white pill / outline), `Chip`, `TextLink`, `InputField`, `FieldFrame`, `ErrorBanner`, `ScreenHeader`,
and from Phase 1: `BottomSheet` (the only modal pattern: drag/backdrop/back to close), `ListRow`, `ToggleRow`,
`SegmentedTabs`, `Avatar`, `Badge`, `Skeleton`, `EmptyState`. Build new screens from these; add a component here only
when two features need it.

**Gallery:** in dev, open the deep link `<scheme>://gallery` (route `src/app/(auth)/gallery.tsx`) to see every component.

## Navigation transitions
Stacks use `STACK_SCREEN_OPTIONS`; every role's tab group uses `TAB_SCREEN_OPTIONS` (cross-fade, same bar styling);
modals use `BottomSheet`. All three read timings from `Motion`. The customer tab shell is Feed · Discover · Search · Messages · Profile.
