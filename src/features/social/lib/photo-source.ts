import { PixelRatio } from 'react-native';
import type { PostPhoto } from '@/types/social';

/** The narrowest copy that is still sharp at `width` points on this screen. */
export function photoSource(photo: PostPhoto, width: number) {
  const needed = width * PixelRatio.get();
  const copy = [...(photo.smaller ?? [])].sort((a, b) => a.width - b.width).find((s) => s.width >= needed);
  return { uri: copy?.url ?? photo.url };
}

/** The smallest copy, shown while the full photo loads. */
export function photoPlaceholder(photo: PostPhoto) {
  const [smallest] = [...(photo.smaller ?? [])].sort((a, b) => a.width - b.width);
  return smallest ? { uri: smallest.url } : undefined;
}

/** The API keeps photos between 4:5 and 1.91:1; older posts may not be, so the frame is held to the same range. */
export function frameRatio(photo: PostPhoto) {
  const ratio = photo.width > 0 && photo.height > 0 ? photo.width / photo.height : 1;
  return Math.min(1.91, Math.max(0.8, ratio));
}
