/**
 * App-wide runtime configuration.
 * All EXPO_PUBLIC_* variables are embedded at build time by Expo.
 * Never put secrets here — these values are visible in the JS bundle.
 */

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  'https://ruxstar-backend-services-391710984982.us-central1.run.app';

export const APP_SCHEME =
  process.env.EXPO_PUBLIC_APP_SCHEME ?? 'ruxstarapplicationservices';
