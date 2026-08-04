/**
 * Root /explore is unused — real explore tab lives at (user)/explore.tsx
 * Redirect to home so this route never shows a blank screen.
 */
import { Redirect } from 'expo-router';

export default function ExploreRedirect() {
  return <Redirect href="/" />;
}
