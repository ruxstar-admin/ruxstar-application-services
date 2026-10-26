# Ruxstar Mobile — Developer Docs

Scope: **this repo only** (`ruxstar-application-services`, Expo / React Native). Backend
(`ruxstar-backend-services`) and web (`ruxstar-frontend-services`) are out of scope — if the API
doesn't fit a screen, adapt the mobile side and report the mismatch; never edit those repos here.

| Doc | What it covers |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Folder layout, routing/auth guard, state, services |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Tokens, fonts, shared components, haptics table, motion |
| [HISTORY.md](./HISTORY.md) | Why the app was rebuilt, what changed when |
| [DECISIONS.md](./DECISIONS.md) | Short log of non-obvious choices |
| [PLAN.md](./PLAN.md) | Requirements and the phase plan (current phase, open questions) |
| [LOG.md](./LOG.md) | Work log: what was asked, decided, done, next |
| [API_CONTRACTS.md](./API_CONTRACTS.md) | Every endpoint the app calls, real vs mocked (backend hand-off) |
| [HANDOVER.md](./HANDOVER.md) | Run, release, real-vs-mocked, mock switch-over, QA demo values, known gaps |
| [DELIVERABLES.md](./DELIVERABLES.md) | Paid-module deliverables tracker and post-launch terms |

Also read, in this order: `../../AGENTS.md` (Expo docs version to follow), `../../CLAUDE.md`
(hard rules for humans and AI agents), `../../../resources/PRD.md` (module build order).

## Quality gates (run before every commit)
```bash
npx tsc --noEmit        # strict TypeScript, must be clean
npm test                # Jest unit tests, must pass
npx expo lint           # must be clean
npx expo-doctor         # must pass all checks
```
Hard rules: max 1000 lines/file (aim far lower), no duplicated code, no dead code, thin routes,
feature-based folders, imports via `@/`.

## Design target
The look and feel follows the District app (dark surfaces, bottom sheet auth, pill buttons,
haptic feedback on every press) in Ruxstar's brand colours. Reference screenshots live in
`../../../resources/`.
