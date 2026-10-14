import * as Haptics from 'expo-haptics';

/** Thin, named wrapper so every screen fires haptics the same way instead of calling expo-haptics ad hoc. */
export const Feedback = {
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  select: () => Haptics.selectionAsync(),
};
