import * as Device from 'expo-device';
import { secureStorage } from './secure-storage';

const DEVICE_ID_KEY = 'ruxstar_device_id';
const MAX_NAME_LENGTH = 60;

const randomId = () => Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

let cached: Promise<string> | null = null;

/** Stable per install, so the API can label this device's session and replace it on the next sign-in. */
const deviceId = () =>
  (cached ??= (async () => {
    try {
      const saved = await secureStorage.getItem(DEVICE_ID_KEY);
      if (saved) return saved;
      const id = randomId();
      await secureStorage.setItem(DEVICE_ID_KEY, id);
      return id;
    } catch {
      return randomId();
    }
  })());

/** Sent with signup and sign-in, shown on Sessions & devices as for example "Pixel 8". */
export const deviceInfo = async () => ({
  deviceId: await deviceId(),
  deviceName: (Device.modelName ?? Device.deviceName ?? 'Phone').slice(0, MAX_NAME_LENGTH),
});
