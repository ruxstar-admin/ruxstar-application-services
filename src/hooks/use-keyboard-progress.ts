import { useEffect } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { Motion } from '@/constants/motion';

const SHOW_EVENT = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE_EVENT = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

/** Shared value that eases 0 → 1 when the keyboard opens and back to 0 when it closes. */
export function useKeyboardProgress() {
  const progress = useSharedValue(0);

  useEffect(() => {
    const timing = { duration: Motion.duration.base, easing: Motion.easing.standard };
    const show = Keyboard.addListener(SHOW_EVENT, () => {
      progress.value = withTiming(1, timing);
    });
    const hide = Keyboard.addListener(HIDE_EVENT, () => {
      progress.value = withTiming(0, timing);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [progress]);

  return progress;
}
