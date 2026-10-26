/** Ruxstar theme: purple on near-black, white primary action (District-style). Frozen after Phase 1 sign-off. */
export const Brand = {
  primary: '#B45CF2', // accent purple (links, active states, focus)
  primarySoft: '#D9A0FF',
  primaryDeep: '#7C3AED',
  secondary: '#32B2FA',
  action: '#FFFFFF', // primary button fill
  onAction: '#0D0C12', // text/icon on the primary button
  bg: '#0D0C12',
  surface: '#15141B',
  surfaceAlt: '#1F1D29',
  border: '#2C2A39',
  text: '#FFFFFF',
  textMuted: '#9E9CB0',
  textFaint: '#5E5C70',
  success: '#34C759',
  warning: '#FFB020',
  error: '#FF453A',
  disabled: '#34323F',
  disabledText: '#7A7889',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 999,
} as const;

/** Plus Jakarta Sans, loaded in the root layout. Each weight is its own family — never pair these with `fontWeight`. */
export const Fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

export const Typography = {
  display: { fontFamily: Fonts.bold, fontSize: 32 },
  title: { fontFamily: Fonts.semibold, fontSize: 24 },
  heading: { fontFamily: Fonts.semibold, fontSize: 22, lineHeight: 30 },
  body: { fontFamily: Fonts.regular, fontSize: 16 },
  bodyStrong: { fontFamily: Fonts.bold, fontSize: 16 },
  caption: { fontFamily: Fonts.regular, fontSize: 13 },
  overline: { fontFamily: Fonts.medium, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' as const },
} as const;

export const Gradients = {
  /** Welcome backdrop: near-black at the top deepening into indigo behind the hero, visible around the sheet's rounded corners. */
  authBackdrop: {
    colors: ['#0D0C12', '#1A1740', '#2A1B6B', '#2A1B6B'] as [string, string, string, string],
    locations: [0, 0.3, 0.55, 1] as [number, number, number, number],
  },
} as const;
