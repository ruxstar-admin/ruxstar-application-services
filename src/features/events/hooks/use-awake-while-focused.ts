import { useCallback } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useFocusEffect } from 'expo-router';

/** Stops the screen dimming and locking while this screen is in front, and lets it sleep again once it isn't. */
export function useAwakeWhileFocused(tag: string) {
  useFocusEffect(
    useCallback(() => {
      activateKeepAwakeAsync(tag).catch(() => undefined);
      return () => {
        deactivateKeepAwake(tag).catch(() => undefined);
      };
    }, [tag]),
  );
}
