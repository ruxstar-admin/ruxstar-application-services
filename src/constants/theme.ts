/**
 * Ruxstar Brand Theme — CRED-inspired
 * Near-black surfaces · Warm cream text · Purple accent
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0A0A0F',
    background: '#ffffff',
    backgroundElement: '#F3F0FF',
    backgroundSelected: '#E9E3FF',
    textSecondary: '#5B4D7A',
  },
  dark: {
    text: '#F0EBE3',
    background: '#08080D',
    backgroundElement: '#0F0F1A',
    backgroundSelected: '#161624',
    textSecondary: '#7A7590',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Ruxstar brand palette — clean white / light theme */
export const Brand = {
  // ── Purple accent ──────────────────────────────────────────────
  primary:       '#7C3AED',
  primaryDark:   '#5B21B6',
  primaryLight:  '#7C3AED',
  primaryXLight: '#9B6FE8',
  primaryGlow:   'rgba(124,58,237,0.10)',

  // ── Surfaces (light steps) ─────────────────────────────────────
  bg:            '#FFFFFF',   // true base — white
  surface1:      '#F5F5F7',   // cards on bg
  surface2:      '#EBEBF0',   // elevated cards
  surface3:      '#E4E4EA',   // modals, bottom sheets

  // Legacy aliases
  surfaceDark:      '#FFFFFF',
  surfaceDarkMid:   '#F5F5F7',
  surfaceDarkLight: '#EBEBF0',
  surfaceCard:         'rgba(0,0,0,0.03)',
  surfaceCardBorder:   'rgba(0,0,0,0.10)',

  // ── Borders ────────────────────────────────────────────────────
  border1:  '#E5E5EA',   // hairline
  border2:  '#D1D1D6',   // standard divider
  border3:  '#AEAEB2',   // emphasized / active

  // Legacy aliases
  glass:            'rgba(0,0,0,0.03)',
  glassBorder:      '#E5E5EA',
  glassBorderStrong:'#D1D1D6',

  // ── Typography ─────────────────────────────────────────────────
  cream:          '#0A0A0F',   // primary text — near black
  creamSub:       '#6C6C70',   // secondary text — medium gray
  creamMuted:     '#AEAEB2',   // muted / disabled text

  // Legacy aliases
  textOnDark:          '#0A0A0F',
  textOnDarkSecondary: '#6C6C70',
  textOnDarkMuted:     '#AEAEB2',

  // ── Status ─────────────────────────────────────────────────────
  success: '#16A34A',
  error:   '#DC2626',
  warning: '#D97706',

  // ── Accent glow ────────────────────────────────────────────────
  accent:     '#7C3AED',
  accentGlow: '#9B6FE8',

  // ── Globe / visuals ────────────────────────────────────────────
  globeAtmosphere: 'rgba(124,58,237,0.12)',
  globeGlow:       'rgba(124,58,237,0.3)',
  globeGrid:       'rgba(124,58,237,0.18)',
  globeLand:       '#7C3AED',
  globeWater:      '#EDE9FE',
  globeHighlight:  'rgba(124,58,237,0.4)',
} as const;

/** Gradient presets */
export const Gradients = {
  authBackground: ['#FFFFFF', '#F5F5F7'] as const,
  primaryButton:  [Brand.primary, Brand.primaryDark] as const,
  vendorButton:   [Brand.primary, Brand.primaryDark] as const,
  cardUser:   ['rgba(124,58,237,0.07)', 'rgba(124,58,237,0.02)'] as const,
  cardVendor: ['rgba(124,58,237,0.07)', 'rgba(124,58,237,0.02)'] as const,
  globeGlow: [
    'rgba(124,58,237,0.0)',
    'rgba(124,58,237,0.04)',
    'rgba(124,58,237,0.10)',
  ] as const,
  marketplace: ['#FFFFFF', '#F5F5F7', '#EBEBF0'] as const,
} as const;

export const Fonts = Platform.select({
  ios:     { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: {
    sans:    'var(--font-display)',
    serif:   'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono:    'var(--font-mono)',
  },
});

export const Spacing = {
  half:  2,
  one:   4,
  two:   8,
  three: 16,
  four:  24,
  five:  32,
  six:   64,
} as const;

export const Radius = {
  sm:   8,
  md:   14,
  lg:   18,
  xl:   24,
  xxl:  32,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
