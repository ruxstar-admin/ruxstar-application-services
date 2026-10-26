import { Redirect } from 'expo-router';
import { GalleryScreen } from '@/features/design/screens/GalleryScreen';

/** Dev-only component gallery: open with the deep link `<scheme>://gallery`. Hidden in release builds. */
export default function Gallery() {
  return __DEV__ ? <GalleryScreen /> : <Redirect href="/(auth)/welcome" />;
}
