import { useCallback } from 'react';
import { setAudioModeAsync, useAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useFocusEffect } from 'expo-router';
import green from '@/assets/sounds/scan-green.wav';
import amber from '@/assets/sounds/scan-amber.wav';
import red from '@/assets/sounds/scan-red.wav';

export type ScanTone = 'green' | 'amber' | 'red';

const replay = (player: AudioPlayer) => {
  try {
    player.seekTo(0).catch(() => undefined);
    player.play();
  } catch {
    // A sound that can't play must never stop the gate; the haptic and the colour still show.
  }
};

/**
 * A short sound for each scan result: rising for green, two beeps for amber, a low buzz for red. It stays quiet
 * when the phone is on silent, and mixes with music instead of stopping it.
 */
export function useScanSounds() {
  const g = useAudioPlayer(green);
  const a = useAudioPlayer(amber);
  const r = useAudioPlayer(red);

  useFocusEffect(
    useCallback(() => {
      setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
    }, []),
  );

  return useCallback((tone: ScanTone) => replay(tone === 'green' ? g : tone === 'amber' ? a : r), [g, a, r]);
}
