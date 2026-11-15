import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

/** Where the checkout page sends the player back to: a screen that steps back to the booking. */
export const turfReturn = () => Linking.createURL('/turf/paid');

/** Opens the checkout page in the system browser and waits until it sends the player back or they close it. */
export async function openTurfCheckout(url: string): Promise<void> {
  await WebBrowser.openAuthSessionAsync(url, turfReturn());
}
