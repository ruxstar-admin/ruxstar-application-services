# 🚀 Ruxstar Application Services — Full UI Implementation Plan

> **Stack:** React Native · Expo 56 · Expo Router · TypeScript · Reanimated 4  
> **Brand Color:** `#208AEF` · **Scheme:** `ruxstarapplicationservices`  
> **Target:** iOS · Android · Web (universal)

---

## 📐 Architecture Overview

```
src/
├── app/
│   ├── (auth)/                    ← Auth group (no tabs)
│   │   ├── _layout.tsx            ← Auth stack layout
│   │   ├── welcome.tsx            ← Welcome / role selector screen
│   │   ├── login.tsx              ← Login with 3D Globe + phone field
│   │   ├── otp.tsx                ← OTP verification
│   │   └── register/
│   │       ├── _layout.tsx
│   │       ├── phone.tsx          ← Step 1: Phone entry
│   │       ├── details.tsx        ← Step 2: Name / profile
│   │       └── vendor-details.tsx ← Step 3 (Vendor only)
│   ├── (user)/                    ← User app (with tabs)
│   │   ├── _layout.tsx
│   │   ├── index.tsx              ← User Home
│   │   └── explore.tsx
│   ├── (vendor)/                  ← Vendor app (with tabs)
│   │   ├── _layout.tsx
│   │   └── dashboard.tsx
│   └── _layout.tsx                ← Root layout (auth guard)
├── components/
│   ├── globe/
│   │   ├── Globe3D.tsx            ← 3D Globe (Three.js via expo-gl)
│   │   ├── Globe3D.web.tsx        ← Web variant (react-globe.gl)
│   │   └── GlobeParticles.tsx     ← Floating particle overlay
│   ├── auth/
│   │   ├── PhoneInput.tsx         ← Country code + number field
│   │   ├── OtpInput.tsx           ← 6-cell OTP boxes
│   │   └── RoleCard.tsx           ← User / Vendor role card
│   └── ui/
│       ├── PrimaryButton.tsx
│       ├── InputField.tsx
│       └── GradientBackground.tsx
├── stores/
│   ├── auth-store.ts              ← Zustand auth state
│   └── user-store.ts
├── services/
│   └── auth-service.ts            ← API calls
└── constants/
    ├── theme.ts                   ← Extended Ruxstar theme
    └── countries.ts               ← Country dial codes
```

---

## 🗓️ PHASE 1 — Foundation & Dependency Setup

### Goal: Install packages, extend theme, set up auth routing skeleton

### 1.1 Install Required Packages

```bash
npx expo install expo-gl expo-three three
npx expo install expo-secure-store expo-crypto
npx expo install react-native-phone-number-input
npx expo install @react-native-async-storage/async-storage
npm install zustand react-native-country-flag
npm install react-globe.gl  # web only (lazy imported)
```

### 1.2 Extended Ruxstar Brand Theme (`src/constants/theme.ts`)

| Token | Value | Usage |
|---|---|---|
| `brand.primary` | `#208AEF` | CTAs, active states |
| `brand.secondary` | `#0D5FA8` | Pressed states |
| `brand.accent` | `#00D4FF` | Globe glow, highlights |
| `brand.vendorGold` | `#F5A623` | Vendor-specific accents |
| `brand.surface` | `#0A0F1E` | Dark login BG |
| `brand.gradient` | `['#0A0F1E','#112244']` | Background gradient |
| `brand.success` | `#34C759` | OTP success |
| `brand.error` | `#FF3B30` | Validation errors |

### 1.3 Routing Structure

```
Root _layout.tsx
  ├── If not authenticated → redirect to (auth)/welcome
  ├── If authenticated + role=user → (user) tabs
  └── If authenticated + role=vendor → (vendor) tabs
```

**Deliverables:** Auth skeleton routes · Extended theme · Zustand store scaffolding

---

## 🗓️ PHASE 2 — Welcome Screen (User & Vendor Dual Entry)

### Goal: Beautiful animated welcome with role selection

### 2.1 Screen Layout

```
┌─────────────────────────────────────┐
│                                     │
│         [Ruxstar Logo + Mark]       │
│       Animated fade-in on load      │
│                                     │
│  ┌─────────────────────────────┐    │
│  │   Mini 3D Globe (rotating)  │    │  ← Smaller decorative globe
│  └─────────────────────────────┘    │
│                                     │
│     "Welcome to Ruxstar"            │
│     "Connect · Discover · Thrive"   │
│                                     │
│  ┌──────────────┐ ┌──────────────┐  │
│  │  👤 I'm a   │ │  🏪 I'm a   │  │
│  │   Customer  │ │    Vendor   │  │
│  └──────────────┘ └──────────────┘  │
│                                     │
│     Already have an account?        │
│          [Sign In →]                │
└─────────────────────────────────────┘
```

### 2.2 Animations
- Logo: `FadeIn` + `SlideInDown` (Reanimated)
- Role cards: staggered `ZoomIn` entry
- Globe: continuous slow rotation on mount
- Background: dark space-like gradient `#0A0F1E → #112244`

### 2.3 Role Cards
- **Customer Card:** Blue gradient, person icon
- **Vendor Card:** Gold gradient `#F5A623`, store icon
- On press: spring scale animation → navigate to `(auth)/login?role=user|vendor`

**Deliverables:** `welcome.tsx` · `RoleCard.tsx` · `GradientBackground.tsx`

---

## 🗓️ PHASE 3 — Login Screen with 3D Globe

### Goal: Immersive login screen with interactive 3D Earth globe

### 3.1 Screen Layout

```
┌─────────────────────────────────────┐
│                                     │
│  ╔═══════════════════════════════╗  │
│  ║                               ║  │
│  ║       🌍 3D EARTH GLOBE       ║  │  ← Top 45% of screen
│  ║    Rotating, glowing edges    ║  │
│  ║    Star field background      ║  │
│  ╚═══════════════════════════════╝  │
│                                     │
│  ┌─────────────────────────────┐    │
│  │    [Ruxstar Logo]           │    │
│  │    "Sign in to Ruxstar"     │    │
│  │                             │    │
│  │  ┌──────┐ ┌──────────────┐  │    │
│  │  │ +91 ▼│ │  Phone No.   │  │    │  ← Phone + Country code
│  │  └──────┘ └──────────────┘  │    │
│  │                             │    │
│  │  [ Continue with OTP  →  ]  │    │
│  │                             │    │
│  │  ─────── or ─────────────   │    │
│  │                             │    │
│  │  [ 🔵 Continue with Google] │    │
│  │                             │    │
│  │  New here? Create account   │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### 3.2 3D Globe Technical Details

**Native (iOS/Android) — `Globe3D.tsx`:**
```
Library: expo-gl + expo-three + three.js
- WebGLView rendering a Three.js scene
- Earth texture (day map 2k texture)
- Atmosphere glow shader (custom GLSL)
- Auto-rotation: 0.002 rad/frame on Y axis
- Touch: drag to rotate (PanGestureHandler)
- Ambient light + directional sunlight
- Star field: BufferGeometry with 2000 random points
```

**Web — `Globe3D.web.tsx`:**
```
Library: react-globe.gl (lazy imported)
- Same rotation, atmosphere glow
- Point lights for major cities (optional)
```

### 3.3 Phone Number Input Component (`PhoneInput.tsx`)

```
Features:
  ✅ Country flag + dial code dropdown
  ✅ Formatted number input (auto-formats as user types)
  ✅ Numeric keyboard on mobile
  ✅ Validation (min/max length per country)
  ✅ 195+ countries supported
  
UI:
  - Dark glassmorphism style (matches login BG)
  - Focus ring: brand blue glow
  - Error state: red border + shake animation
```

### 3.4 Animations
- Globe rises from bottom on mount: `SlideInUp`
- Form panel slides up from bottom: `SlideInDown`
- Button: shimmer loading state during OTP send
- Globe pulses (scale 1.0 → 1.02) when phone is valid

**Deliverables:** `login.tsx` · `Globe3D.tsx` · `Globe3D.web.tsx` · `PhoneInput.tsx`

---

## 🗓️ PHASE 4 — OTP Verification Screen

### Goal: Clean OTP entry with auto-verify

### 4.1 Screen Layout

```
┌─────────────────────────────────────┐
│                                     │
│  ← Back                             │
│                                     │
│     [Lock / Shield Icon animated]   │
│                                     │
│     "Verify your number"            │
│     "We sent a 6-digit code to"     │
│     "+91 98765 43210"               │
│                                     │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐│
│  │   │ │   │ │   │ │   │ │   │ │   ││  ← 6 OTP cells
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘│
│                                     │
│     [ Verify & Continue →  ]        │
│                                     │
│  Didn't receive?  Resend in 0:45    │
│                                     │
└─────────────────────────────────────┘
```

### 4.2 OTP Cell Features
- Auto-advance on digit entry
- Auto-backspace to previous cell
- Auto-submit when all 6 filled
- Paste detection (fills all cells)
- Success: green cells + checkmark animation
- Error: red shake animation + clear

### 4.3 Timer
- 60-second countdown, then "Resend code" activates
- Re-sends via same API endpoint

**Deliverables:** `otp.tsx` · `OtpInput.tsx`

---

## 🗓️ PHASE 5 — Registration Flow (Mobile Number Based)

### Goal: New account creation via phone number

### 5.1 Flow

```
welcome.tsx (role selected)
    ↓
register/phone.tsx     ← Enter mobile number (same PhoneInput component)
    ↓
otp.tsx                ← Shared OTP screen (mode: "register")
    ↓
register/details.tsx   ← Name, Email (optional)
    ↓  (if vendor)
register/vendor-details.tsx  ← Business name, Category, GST
    ↓
(user)/ or (vendor)/   ← Main app
```

### 5.2 Step 1 — Phone Entry (`register/phone.tsx`)

```
┌─────────────────────────────────────┐
│  ← Back         Step 1 of 3         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│  ███████░░░░░░░░░░░░░░░░░  33%      │
│                                     │
│     "Create your account"           │
│     [role badge: Customer/Vendor]   │
│                                     │
│     "Enter your mobile number"      │
│     "We'll verify it with an OTP"   │
│                                     │
│  ┌──────┐ ┌──────────────────────┐  │
│  │ +91 ▼│ │  Mobile Number       │  │
│  └──────┘ └──────────────────────┘  │
│                                     │
│  ☐  I agree to Terms & Privacy      │
│                                     │
│  [  Send Verification Code  →  ]    │
└─────────────────────────────────────┘
```

### 5.3 Step 2 — Profile Details (`register/details.tsx`)

```
┌─────────────────────────────────────┐
│  ← Back         Step 2 of 3         │
│  ███████████████░░░░░░░░░  66%      │
│                                     │
│     "Tell us about yourself"        │
│                                     │
│  Full Name *                        │
│  ┌────────────────────────────────┐ │
│  │  Enter your full name          │ │
│  └────────────────────────────────┘ │
│                                     │
│  Email (optional)                   │
│  ┌────────────────────────────────┐ │
│  │  Enter your email              │ │
│  └────────────────────────────────┘ │
│                                     │
│  Date of Birth                      │
│  ┌────────────────────────────────┐ │
│  │  DD / MM / YYYY         📅     │ │
│  └────────────────────────────────┘ │
│                                     │
│  [  Continue  →  ]                  │
└─────────────────────────────────────┘
```

### 5.4 Step 3 (Vendor Only) — Business Details (`register/vendor-details.tsx`)

```
┌─────────────────────────────────────┐
│  ← Back         Step 3 of 3         │
│  ████████████████████████  100%     │
│                                     │
│     🏪 "Set up your business"       │
│                                     │
│  Business Name *                    │
│  ┌────────────────────────────────┐ │
│  └────────────────────────────────┘ │
│                                     │
│  Business Category *                │
│  ┌────────────────────────────────┐ │
│  │  Select category          ▼    │ │
│  └────────────────────────────────┘ │
│                                     │
│  GST Number (optional)              │
│  ┌────────────────────────────────┐ │
│  └────────────────────────────────┘ │
│                                     │
│  [  Complete Setup  🎉  ]           │
└─────────────────────────────────────┘
```

**Deliverables:** `register/phone.tsx` · `register/details.tsx` · `register/vendor-details.tsx`

---

## 🗓️ PHASE 6 — Auth State & Navigation Guard

### Goal: Persistent auth, protected routes, token management

### 6.1 Zustand Auth Store (`stores/auth-store.ts`)

```typescript
interface AuthState {
  token: string | null;
  userId: string | null;
  role: 'user' | 'vendor' | null;
  phone: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // Actions
  setAuth(token, userId, role, phone): void;
  clearAuth(): void;
}
```

### 6.2 Root Layout Auth Guard (`app/_layout.tsx`)

```typescript
// Navigation logic:
if (!isAuthenticated) → redirect to (auth)/welcome
if (role === 'user') → (user) tabs
if (role === 'vendor') → (vendor) tabs
```

### 6.3 Secure Token Storage
- `expo-secure-store` for JWT token (native)
- `localStorage` encrypted for web
- Auto-refresh on app foreground

### 6.4 Auth Service (`services/auth-service.ts`)
```
POST /auth/send-otp    { phone, country_code }
POST /auth/verify-otp  { phone, otp, session_id }
POST /auth/register    { phone, name, email, role, ... }
POST /auth/refresh     { refresh_token }
```

**Deliverables:** `auth-store.ts` · `user-store.ts` · `auth-service.ts` · Root layout guard

---

## 🗓️ PHASE 7 — Post-Auth Dashboard Shells

### Goal: Skeleton layouts for User and Vendor main apps

### 7.1 User App (`(user)/`)

```
Bottom Tabs:
  🏠 Home     — Feed / Discover
  🔍 Explore  — Search & Browse
  🛒 Orders   — My purchases
  👤 Profile  — Account settings
```

### 7.2 Vendor App (`(vendor)/`)

```
Bottom Tabs:
  📊 Dashboard  — Revenue & stats
  📦 Products   — Inventory
  📋 Orders     — Incoming orders
  👤 Profile    — Business profile
```

**Deliverables:** User tabs shell · Vendor tabs shell

---

## 📦 Complete Package List

| Package | Version | Purpose |
|---|---|---|
| `expo-gl` | latest | WebGL context for 3D globe native |
| `expo-three` | latest | Three.js bridge for Expo |
| `three` | ^0.167 | 3D rendering engine |
| `react-globe.gl` | latest | Web 3D globe |
| `expo-secure-store` | latest | Secure token storage |
| `zustand` | ^5 | State management |
| `react-native-phone-number-input` | latest | Phone + country picker |
| `@react-native-async-storage/async-storage` | latest | Persistent storage |
| `react-native-country-flag` | latest | Country flag SVGs |
| `expo-crypto` | latest | OTP hash verification |

---

## 🎨 Design System Summary

### Colors
```
Background (dark login): #0A0F1E
Background (app):        #FFFFFF / #000000
Primary blue:            #208AEF
Primary dark:            #0D5FA8
Accent glow:             #00D4FF
Vendor gold:             #F5A623
Success:                 #34C759
Error:                   #FF3B30
```

### Typography
```
Display:  32px Bold  — Screen titles
Title:    24px SemiBold — Section heads
Body:     16px Regular
Caption:  13px Regular — Hints, labels
Code:     13px Mono
```

### Spacing Scale (existing Ruxstar theme)
```
half(2) · one(4) · two(8) · three(16) · four(24) · five(32) · six(64)
```

### Component Radius
```
Input fields:   12px
Buttons:        14px (pill: 999px)
Cards:          20px
Globe container: circular (50%)
```

---

## 🚦 Implementation Order & Timeline

| Phase | Screen / Feature | Est. Effort | Priority |
|---|---|---|---|
| **1** | Foundation: deps, theme, routing | 1 day | 🔴 Critical |
| **2** | Welcome Screen (role selector) | 1 day | 🔴 Critical |
| **3** | Login Screen + 3D Globe | 2 days | 🔴 Critical |
| **4** | OTP Verification | 1 day | 🔴 Critical |
| **5** | Registration Flow (3 steps) | 2 days | 🔴 Critical |
| **6** | Auth State & Navigation Guard | 1 day | 🔴 Critical |
| **7** | Dashboard Shells (User+Vendor) | 1 day | 🟡 High |

**Total:** ~9 days for full auth + welcome flow

---

## ✅ Ready to Start

**Recommended start order:**
1. Run `Phase 1` dependency install
2. Build `welcome.tsx` (visible immediately, no backend needed)
3. Build `login.tsx` with `Globe3D.tsx` (most impressive, hero screen)
4. Wire `PhoneInput.tsx` → `otp.tsx` → `register/` flow
5. Add `auth-store.ts` and navigation guard last

> Say **"start Phase 1"**, **"start Phase 2"**, etc. to begin implementation of each phase.
