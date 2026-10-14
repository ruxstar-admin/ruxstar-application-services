/** Brand palette sampled directly from resources/logo.png (yellow/blue star on black). */
export const Brand = {
  primary: '#EBDC06', // logo yellow
  secondary: '#32B2FA', // logo blue
  bg: '#000000',
  surface: '#121212',
  surfaceAlt: '#1C1C1E',
  border: '#2A2A2C',
  text: '#FFFFFF',
  textMuted: '#9A9A9E',
  textFaint: '#5C5C60',
  success: '#34C759',
  error: '#FF453A',
  disabled: '#3A3A3C',
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

export const Typography = {
  display: { fontSize: 32, fontWeight: '700' as const },
  title: { fontSize: 24, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
} as const;

export const Gradients = {
  /** Black at the very top of auth screens, warming into a yellow glow just above the sheet, then back to black. */
  authTop: {
    colors: [Brand.bg, 'rgba(235,220,6,0.18)', 'rgba(235,220,6,0.5)', Brand.bg] as [string, string, string, string],
    locations: [0, 0.35, 0.65, 1] as [number, number, number, number],
  },
} as const;
