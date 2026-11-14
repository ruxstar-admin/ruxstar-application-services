import { useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import * as Brightness from 'expo-brightness';
import { useFocusEffect } from 'expo-router';

/** Turns this app's screen to full and returns the level it was at; null when it couldn't. */
async function raise(): Promise<number | null> {
  try {
    if (!(await Brightness.isAvailableAsync())) return null;
    const before = await Brightness.getBrightnessAsync();
    await Brightness.setBrightnessAsync(1);
    return before;
  } catch {
    return null;
  }
}

/** Android goes back to following the system (and auto-brightness); iOS has no such switch, so it gets the old level back. */
function restore(before: number | null) {
  if (before === null) return;
  const done = Platform.OS === 'android' ? Brightness.restoreSystemBrightnessAsync() : Brightness.setBrightnessAsync(before);
  done.catch(() => undefined);
}

/**
 * Full brightness while the screen is focused and `on`, so a gate scanner can read a QR off it. It goes back when
 * the screen loses focus or the app goes to the background, since iOS would otherwise keep it bright until the phone locks.
 */
export function useFullBrightness(on: boolean) {
  useFocusEffect(
    useCallback(() => {
      if (!on) return;
      let before: Promise<number | null> | null = null;
      const up = () => {
        before ??= raise();
      };
      const down = () => {
        const pending = before;
        before = null;
        void pending?.then(restore);
      };
      up();
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') up();
        else if (state === 'background') down();
      });
      return () => {
        sub.remove();
        down();
      };
    }, [on]),
  );
}
