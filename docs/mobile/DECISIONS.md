# Decisions

1. **Mobile-only changes.** Backend/web are never edited from this repo's work.
2. **Docs live in `docs/mobile/`** inside this repo so they version with the code.
3. **Plus Jakarta Sans** chosen as the closest free match to District's geometric sans.
4. **Single phone entry for login + signup** (Welcome): `signup/send-otp` 409 → routes to Login.
5. **SMS-only OTP resend** — backend has no WhatsApp channel.
6. **No "Skip" / guest mode** — District has it; Ruxstar requires an account for every role.
7. **Hero is brand-only** (logo + rotating category label) until real illustration assets exist.
