# History

- **2026-09-07** — Previous UI judged "clumsy". `src/` and `assets/` were cleared and the app
  rebuilt from a clean baseline. `.git`, `.expo`, `app.json`, `eas.json`, `package.json`, `.env`
  were deliberately kept (Expo/EAS login and Cloud Run URLs already wired). A full pre-clear
  backup zip exists one level above this repo: `ruxstar-application-services.zip`
  (includes old git history). The old code is also still in git history before commit `ef3502a`.
- **2026-10-14** — Expo SDK 57 packages updated to latest patch (expo 57.0.28). Design foundation
  (Plus Jakarta Sans, grey disabled buttons, haptics map, shared auth shell) and District-style
  Welcome / OTP / Login / Register screens built on branch `feat/auth-district-ui`.
