import { Easing } from 'react-native-reanimated';

/** Total length of the landing sequence; every hero layer reads its slice of this one clock. */
export const INTRO_MS = 2800;
/** One full lap of the icons around the ring. */
export const ORBIT_LAP_MS = 26000;

/** Progress (0–1) of the slice [start, end] of the intro clock, eased. Call from a worklet. */
export const segment = (clock: number, start: number, end: number, easing: (t: number) => number = Easing.out(Easing.cubic)) => {
  'worklet';
  const t = Math.min(1, Math.max(0, (clock - start) / (end - start)));
  return easing(t);
};
