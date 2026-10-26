# Ruxstar Mobile — Requirements & Phase Plan

Status: **Phases 0–11 built (2026-10-22) — nothing is verified by you yet.** Per `CLAUDE.md` §0 a phase is only ticked after you verify it on a device; use `HANDOVER.md` §4 for demo values.
Backend and web are never touched; the backend team owns them. Where an endpoint does not exist
the app **mocks it** (see §5) and records the contract so the backend team can build to it.

## 1. Sources (what this plan is built from)

| Source | What it gave us |
|---|---|
| `Screen recording 2026-09-13.webm` | The functional prototype: every screen/flow the app must have (§2.1). Its black-and-white look is **not** the target; only behaviour and flow are. |
| `ruxstar-scope-review (1).pdf` (13 Oct 2026) | 17 locked architecture decisions: what is in the first release, who the clients are, money rules (§2.2). |
| `Notes_261017_101120.pdf` | Commercial / delivery terms: warranty, handover, support, no double charging (§6). Not app features. |
| `resources/PRD.md` | Existing module checklist (build order + "verified by user" rule). Must be reconciled with the scope review (§3). |
| District app video + screenshot | Visual and motion target: dark/purple, bottom-sheet auth, pill buttons, hero animation, keyboard transition. |

Standing rules from the scope review: **UI/UX first, speed/performance second.** Each business is its
own module.

## 2. Requirements

### 2.1 Functional — from the prototype recording
Screens seen in the recording, grouped by area. Items marked (?) were read from small frames and need
confirming against the prototype before build.

**Auth**
- Welcome / log in / sign up on one phone-number entry (+91), then Continue.
- Log in with **Password** or **One-time code** (tab switch), show/hide password, "Forgot?", "Create an account".
- OTP screen: 6 boxes, 30 s resend timer, Verify (disabled until complete).
- Terms / Privacy links on every auth screen.

**Shell & navigation**
- Bottom tabs: Feed, Business/Discover, Search, Messages (badge), Profile. Top bar: menu, wordmark, notifications (badge), messages (badge).

**Social**
- Global feed: posts with author + store tag, rich cards (image / certificate / chat screenshot), like / comment / share / save, like counts, "Book ₹…" and "Order ₹…" actions on business posts, floating "+" to post.
- Post menu: replace / edit (?).
- Report flow (bottom sheet): Spam or scam · Fake store or listing · Rude or abusive behaviour · Never delivered my order · Something else → "Thanks for telling us" confirmation with **Also block** and **Done**.

**Profile**
- Own profile: avatar, name, posts / engagements / rating counts, @username, bio, member-since, role badges (Normal user, Vendor, Trainer), **Edit profile**, Personal / Business tabs with a media grid, role switcher chips.
- Other user's profile: Message, Visit store, Report; Personal / Store tabs.
- Edit profile: photo, name, username, bio, link; private fields: email, phone, gender; business information entry.
- Settings: Sessions & devices · Notification preferences · Blocked users · Account & data (export / pause / delete) · Log out.
- Notification preferences: Orders & deliveries · Messages · Likes & comments · Work & offers · Weekly digest (toggles).
- Notifications centre: employment offers (Accept / Decline), order updates, class reminders.

**Identity verification (base KYC, stepper "Step n of 7")**
Aadhaar number → Aadhaar OTP → PAN card photo → selfie (face match) → bank account + IFSC → review ("Check what you submit", all items Ready) → submit for verification.

**Vendor onboarding & portal**
- Vendor verification (4 steps): GST or shop licence → shop photo → review → "Store verified" → back to Ruxstar.
- Vendor dashboard: earnings, withdrawable, withdrawn, open orders, registrations, students, recent activity (audit-style feed), store open/closed toggle.

**Delivery partner (separate app, see §3 decision D3)**
- In main app: delivery verification (driving licence photo + number, vehicle photo + RC, review) → "You are a delivery partner" → **Open Ruxstar Partner app**.
- Partner app: own login (Partner mobile + password), "Deliveries only"; Home (on-duty card, Go offline, earned today, drops done, online time, jobs waiting, recent drops with ratings), tabs Home / Jobs / Earnings.

### 2.2 Functional — from the scope review (what is in / out)
- **In first release:** Social (global feed, direct messages, groups, communities); independent business modules **Print-on-demand, Events, PG/hostel (find-your-stay), Coaching/training**; delivery network for modules that need a rider.
- **Out:** creator routes, general commerce, restaurant module. Admin and delivery are **not** in the main app.
- **One account; roles stack** (vendor, vendor-employee, delivery partner). Admin / staff are website-only.
- **Employment:** vendor offers or accepts a request, grants a subset of module capabilities; owner-only actions stay with owner/admin; grant stays off until base KYC approved; delivery work also needs delivery KYC; every action audited; revoke returns open work to owner.
- **Money (one ledger):** prepaid only (no COD); pending until completion or 7 days; cancel inside window = full refund, no approval; weekly payout net of module commission; rider paid from delivery fee; Ruxstar coupons paid by Ruxstar, vendor coupons by vendor; withdrawals to verified bank/UPI.
- **Coaching:** full batch fee up front, no instalments; full refund until the first session; no refund after dropout or single-class change; whole-batch cancel refunds everyone; **the pay screen must state this before payment.**
- **Delivery per module:** vendor's own staff → Ruxstar partner → Shadowfax, one at a time; admin enables per module (POD on; Events, Coaching, PG off). Customer and vendor see the same status.
- **PG/hostel:** vendor lists property, rooms/beds, availability, location, facilities; user searches by location + facilities and books a bed/room for chosen dates.
- Parked (not needed to start): delivery radius, offer timer, proof of delivery.

### 2.3 Non-functional (all phases)
1. **UI/UX first:** simple, neat, one consistent theme (§4 Phase 1). No screen ships without loading, empty, error and offline states.
2. **Transitions:** one shared pattern for stack push, tab switch, modal/bottom-sheet; tokens in `constants/motion.ts`; native-thread animation; reduced-motion respected.
3. **Performance:** 60 fps on a mid-range Android; lists virtualised; images cached (`expo-image`); no JS-thread animation.
4. **Repo rules:** `CLAUDE.md` §2 (≤1000 lines/file, no duplication, thin routes, strict TS, `@/` alias, haptics via `Feedback`, no `fontWeight` with Plus Jakarta).
5. **Quality gates before every phase closes:** `tsc`, `jest`, `expo lint`, `expo-doctor` green.
6. **Everything tracked:** `AGENTS.md`, `LOG.md`, `DECISIONS.md`, `API_CONTRACTS.md` updated in the same change as the code (§5).

## 3. Conflicts and decisions needed before we build

| # | Issue | Proposed default |
|---|---|---|
| D1 | **Scope review excludes "creator" and "general commerce"**, but our welcome hero shows *Shopping* / *Creators* captions and a shopping animation, and `CLAUDE.md`/`PRD.md` still list commerce + creator modules. | Hero captions become **Feed · Print · Events · Stay · Learn**. Update `CLAUDE.md` and `PRD.md` to the 13 Oct scope. Replace the shopping illustration when a suitable one is chosen. |
| D2 | **Theme.** Prototype is black-and-white; District target is dark purple; code currently has a yellow/blue brand and a yellow Continue button. | One purple-on-near-black theme with a **white primary pill button** (as in the District video). Tokens finalised in Phase 1 and approved by you before screens use them. |
| D3 | **Delivery app is a separate app** (scope review #3). Prototype shows "Open Ruxstar Partner app". | Build it **last**, as a second Expo app sharing a small `packages/` layer (theme, api client, auth). Needs your call: monorepo vs separate repo. Until then the main app only has the verification flow + deep link. |
| D4 | **PRD ↔ scope drift:** PRD has Trainings/Events/POD but no PG/hostel, and a "Module 10 Admin" that the scope puts on the website. | Reconcile PRD to the scope review in Phase 0; admin stays out of the app. |
| D5 | **"Verified by you" rule** (`CLAUDE.md` §0): checkboxes in PRD only change after you verify. | Keep. Each phase ends with a demo checklist you sign off. |

## 4. Phases

Sizes: S ≈ days, M ≈ 1–2 weeks, L ≈ 2–4 weeks (one developer + agent). Each phase ends with:
quality gates green · LOG/DECISIONS/API_CONTRACTS updated · demo checklist you verify.

### Phase 0 — Foundations & tracking (S) — built 2026-10-22, not yet verified by you
- Write `AGENTS.md` (§5.1), `docs/mobile/LOG.md` (§5.2), `API_CONTRACTS.md` (§5.3); reconcile `PRD.md` + `CLAUDE.md` to the scope review (D1, D4).
- Mock layer in `src/services` (§5.4) with an environment switch and per-endpoint override.
- Runtime `logger` (§5.5), wired to Sentry breadcrumbs, PII-redacting.
- Commit the current welcome-hero work after cleanup (captions per D1).
- **Exit:** a new agent or developer can read three files and know the rules, state and next step.

### Phase 1 — Design system, theme, navigation & transitions (M) — built 2026-10-22, not yet verified by you
- Final purple theme tokens (colour, type, spacing, radius, elevation), light-touch dark only; approved by you first (D2).
- Shared UI kit: buttons (white primary pill, outline, ghost), inputs, OTP boxes, list rows, cards, chips, tabs, toggles, avatar, badge, skeleton, empty/error states, toast, **bottom sheet** (used by report, pickers, confirmations).
- Navigation shells for `(auth)`, `(app)` tabs, stacks; one transition pattern; tab bar; top bar.
- **Welcome page** polished: hero animation once, rotating caption, keyboard transition, sheet with curved corners.
- **Exit:** a gallery/dev screen shows every component in every state; transitions identical across stacks.

### Phase 2 — Auth (M) — built 2026-10-22, not yet verified by you
- Phone entry → sign-up vs log-in routing; log in by password or OTP tab; OTP verify; create password; forgot password (mocked); terms consent; lockout and error messaging per PRD Module 1–3.
- Session store, secure token storage, auth guard (rebuild per `CLAUDE.md` §6).
- **Mock:** username, consent versioning, lockout, device registration, forgot-password.
- **Exit:** full auth happy path + every error path works on mocks and on real endpoints that exist.

### Phase 3 — Profile & settings (M) — built 2026-10-22, not yet verified by you
- Own/other profile, edit profile, role badges, media grid, sessions & devices, notification preferences, blocked users, account & data, log out.
- Report-user and block flows (shared with Phase 5 via the same sheet).
- **Exit:** all profile screens from §2.1 match the prototype's behaviour in the new theme.

### Phase 4 — Identity verification & role gating (M) — built 2026-10-22, not yet verified by you
- Stepper component (Aadhaar → OTP → PAN → selfie → bank → review → submit), camera/photo capture, resumable progress.
- Vendor add-on (GST/shop licence, shop photo) and delivery add-on (licence, vehicle/RC) per scope; "grant stays off until KYC approved".
- Status screens: pending, rejected (with reason), verified.
- **Mock:** all KYC endpoints and approval state (switchable in a dev menu).

### Phase 5 — Social: feed, posts, search, notifications (L) — built 2026-10-22, not yet verified by you
- Global feed (virtualised, pull to refresh, endless scroll), post create/edit/delete, reactions/comments, report → moderation confirmation, search (users, businesses, events, courses, stays), notifications centre with employment-offer actions.

### Phase 6 — Messages, groups, communities (L) — built 2026-10-22, not yet verified by you
- DM list + thread, groups, communities (broadcast + posting rights), unread badges, push-open deep links. Transport decision (polling vs socket) recorded in DECISIONS; mocked until the API exists.

### Phase 7 — Vendor portal & employment (L) — built 2026-10-22, not yet verified by you
- Vendor dashboard, store open/closed, recent activity/audit feed, employment offers (offer / request / accept / revoke), capability switches, owner-only actions guarded.

### Phase 8 — Business modules (L each, in this order, each shippable alone) — built 2026-10-22, not yet verified by you
1. **Print-on-demand** — vendor setup; customer upload → specs → price → delivery/pickup → pay → track.
2. **Events** — create/browse, register, ticket QR, attendance scan.
3. **Coaching / training** — course → batch, enrol, pay screen with the refund statement (§2.2), classes, reminders.
4. **PG / hostel** — property/rooms/beds for vendors; location + facility search and date booking for users.
- Delivery handoff UI is present but **hidden** for modules where admin has not enabled it.

### Phase 9 — Money (M) — built 2026-10-22, not yet verified by you
- Payment sheet (Cashfree), order/booking receipts, ledger view (pending → settled), cancel/refund with the 7-day rule, vendor earnings + withdrawals to verified bank/UPI, coupons (Ruxstar vs vendor funded). Real Cashfree SDK behind a mock until sandbox keys are provided.

### Phase 10 — Delivery partner app (L, decision D3) — built 2026-10-22, not yet verified by you
- Separate app: partner login, KYC gate, online/offline, job offers, accept/decline, navigation (Google Maps), pickup/drop status, earnings.

### Phase 11 — Hardening, release & handover (M) — built 2026-10-22, not yet verified by you
- Performance pass, accessibility pass, offline/slow-network pass, crash-free check (Sentry), EAS preview + production builds, store listing assets.
- Technical handover pack (§6): source ownership notes, architecture + deployment instructions, runbook, API contract status (what is real vs mocked), known issues.

## 5. Working system (tracking, mocks, logs)

### 5.1 `AGENTS.md` (repo root)
The first file any agent/human reads. Contents: read order (`AGENTS.md` → `CLAUDE.md` → `docs/mobile/PLAN.md` → `LOG.md` latest entries); Expo version warning (already there); scope fence (mobile only; never edit backend/web); definition of done (gates + docs + log); mock policy; how to write a LOG entry; what needs user approval (new dependency, new module, deleting files, changing theme tokens).

### 5.2 `docs/mobile/LOG.md` (append-only work log)
One entry per working session or request, newest first:
```
## 2026-10-22 — <short title>
Prompt: <what you asked, in your words>
Decision: <what we chose and why> (link DECISIONS #n)
Done: <files / screens>      Not done / blocked: <...>
Mocks added: <endpoints>     Verified by user: yes/no
Next: <one line>
```
`DECISIONS.md` stays the short numbered list of non-obvious choices; `PLAN.md` phase checkboxes are ticked only after you verify.

### 5.3 `docs/mobile/API_CONTRACTS.md` (the handover to the backend team)
Table of every endpoint the app calls: method + path · request · response · **status (real / mocked / partial)** · screen that uses it · notes. This is what the backend team builds against, and what removes mocks later.

### 5.4 Mock layer
- `src/services/mock/` holds handlers keyed by `METHOD /path` with realistic data, latency and error cases (400/401/409/429/500).
- `api-client` asks the registry first when the route is flagged mocked; env `EXPO_PUBLIC_USE_MOCKS` (all/none) plus a per-route list so a real endpoint can be switched on the day it exists.
- Services and screens never know whether a call is real or mocked, so removing a mock is a one-line change.
- A small dev-only indicator shows when a screen is running on mocked data.

### 5.5 Runtime logger
`src/lib/logger.ts`: levels (debug/info/warn/error), tagged by feature, console in dev, Sentry breadcrumbs/events in release, redacts phone, tokens, Aadhaar/PAN/bank numbers. Replaces ad-hoc `console.*`.

## 6. Commercial & handover requirements (from `Notes_261017`)
These are contract terms to put to the delivery team, not app features. Tracked here so they are not lost:
1. **No double charge:** list the outstanding deliverables for the already-paid modules (Print-on-demand, Coaching/training, Events) against what is built. *We need the original paid scope document to fill this in.*
2. **Warranty:** ≥ 90 days after post-launch v1 for defects, integration stabilisation, user-reported issues; clear line between warranty defects and chargeable new features.
3. Bug fixes for all delivered features/integrations in the agreed scope.
4. Response times and escalation for critical / high / normal issues.
5. Help with production deployment, app releases, launch defects.
6. Source-code ownership, documentation, deployment instructions, complete technical handover (Phase 11 pack).
7. Separate maintenance proposal for months 6–12: monthly charge, support hours, inclusions, service levels.

Phase 0 adds `docs/mobile/DELIVERABLES.md` to track item 1 per module as work progresses.

## 7. Open questions for you
1. **Theme (D2):** confirm purple-on-near-black with a white primary button.
2. **Hero captions / illustration (D1):** confirm Feed · Print · Events · Stay · Learn, and whether to keep the shopping animation for now.
3. **Delivery app (D3):** monorepo or separate repo, and is it in your first release timeline?
4. **Prototype access:** is there a clickable prototype/Figma for the (?) screens, and the paid-scope document for §6.1?
5. **Phase order:** OK to go Auth → Profile → KYC → Social → Messages → Vendor → Modules → Money, or do you want a business module (e.g. Print-on-demand) earlier?
6. **Sign-off rhythm:** do you want to verify at the end of each phase, or each screen?
