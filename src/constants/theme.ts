/** Brand palette sampled directly from resources/logo.png (yellow/blue star on black). */
export const Brand = {
  primary: '#EBDC06', // logo yellow
  secondary: '#32B2FA', // logo blue
  bg: '#0B0B0E',
  surface: '#141417',
  surfaceAlt: '#1F1F23',
  border: '#2A2A2E',
  text: '#FFFFFF',
  textMuted: '#9A9A9E',
  textFaint: '#5C5C60',
  success: '#34C759',
  error: '#FF453A',
  disabled: '#3A3A3E',
  disabledText: '#7A7A80',
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
  /** Hero backdrop: near-black into a warm brand glow, fading back to the sheet colour. */
  authHero: {
    colors: [Brand.bg, 'rgba(235,220,6,0.10)', 'rgba(235,220,6,0.28)', Brand.bg] as [string, string, string, string],
    locations: [0, 0.4, 0.75, 1] as [number, number, number, number],
  },
} as const;
