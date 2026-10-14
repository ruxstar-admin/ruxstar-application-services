# Design system

Source of truth: `src/constants/theme.ts`, `motion.ts`, `src/lib/haptics.ts`.

## Tokens
- **Colour:** `Brand` — dark `bg` (#0B0B0E) and `surface` (#141417), brand yellow `primary`
  (#EBDC06), blue `secondary`. Disabled buttons are grey (`disabled` / `disabledText`), not faded yellow.
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
| `warning` | Non-failure nudge, e.g. "try OTP login" toast after repeated wrong passwords |

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
- `Toast` (`components/ui/Toast.tsx`) is a non-blocking, auto-dismissing notice rendered through
  `AuthFormLayout`'s `overlay` prop. `TextLink`'s `attentionKey` prop makes a link shake.
- Login nudge: after 2 wrong passwords in a row, a toast + `Feedback.warning` + a shake on
  "Log in with OTP instead" steer the user to OTP login.
