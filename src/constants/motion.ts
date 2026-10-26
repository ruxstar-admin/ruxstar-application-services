import { Easing } from 'react-native-reanimated';
import { Brand, Fonts } from './theme';

/** Shared timing/easing tokens — every transition (screen, worklet, or nav) reads from here. */
export const Motion = {
  duration: {
    fast: 150,
    base: 250,
    slow: 400,
  },
  easing: {
    standard: Easing.bezier(0.2, 0, 0, 1),
    decelerate: Easing.out(Easing.quad),
    accelerate: Easing.in(Easing.quad),
  },
} as const;

/**
 * Stack transition applied uniformly across every route group's _layout.tsx. `contentStyle`
 * paints react-native-screens' native Screen container itself (which otherwise defaults to
 * white on Android) — without it, any gap our JS content doesn't cover (keyboard-offset
 * transforms, transient layout, edge-to-edge insets) flashes white instead of our background.
 */
export const STACK_SCREEN_OPTIONS = {
  animation: 'slide_from_right',
  headerShown: false,
  contentStyle: { backgroundColor: Brand.bg },
} as const;

/** Tab bar look + cross-fade used by every role's tab group, so switching tabs feels identical everywhere. */
export const TAB_SCREEN_OPTIONS = {
  headerShown: false,
  animation: 'fade',
  tabBarActiveTintColor: Brand.primarySoft,
  tabBarInactiveTintColor: Brand.textMuted,
  tabBarStyle: { backgroundColor: Brand.surface, borderTopColor: Brand.border },
  tabBarLabelStyle: { fontFamily: Fonts.medium, fontSize: 11 },
  sceneStyle: { backgroundColor: Brand.bg },
} as const;
