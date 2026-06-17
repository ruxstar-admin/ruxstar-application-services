/**
 * Components — Master barrel export (Atomic Design)
 *
 * ┌────────────────────────────────────────────────────────────┐
 * │  ATOMIC DESIGN HIERARCHY                                   │
 * │                                                            │
 * │  ⚛️  Atoms      — Smallest indivisible UI units           │
 * │  🧬  Molecules  — Atoms combined for one purpose          │
 * │  🦠  Organisms  — Complex self-contained sections         │
 * │  📐  Templates  — Page layout shells (no real data)       │
 * │  📄  Pages      — Templates + real data (= your screens)  │
 * └────────────────────────────────────────────────────────────┘
 *
 * Usage:
 *   import { Button, Badge }          from '@/components/atoms';
 *   import { PhoneInput, FormField }  from '@/components/molecules';
 *   import { GlobeHero, LoginForm }   from '@/components/organisms';
 *   import { AuthTemplate }           from '@/components/templates';
 *
 * Or from the master barrel (less tree-shaking friendly):
 *   import { Button, GlobeHero, AuthTemplate } from '@/components';
 */

// ── Atoms ──────────────────────────────────────────────────────────────────
export * from './atoms';

// ── Molecules ──────────────────────────────────────────────────────────────
export * from './molecules';

// ── Organisms ──────────────────────────────────────────────────────────────
export * from './organisms';

// ── Templates ──────────────────────────────────────────────────────────────
export * from './templates';
