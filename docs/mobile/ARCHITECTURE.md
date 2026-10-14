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
