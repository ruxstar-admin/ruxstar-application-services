import * as Haptics from 'expo-haptics';

/**
 * Named haptic patterns — screens never call expo-haptics directly (see docs/mobile/DESIGN_SYSTEM.md).
 * Failures are swallowed: devices without a haptic engine (and web) must never break a press handler.
 */
const fire = (run: () => Promise<void>) => {
  run().catch(() => undefined);
};

export const Feedback = {
  /** Button / chip press. */
  tap: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Heavier confirmation, e.g. a primary action committing. */
  press: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Moving between discrete options or OTP cells. */
  select: () => fire(() => Haptics.selectionAsync()),
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
