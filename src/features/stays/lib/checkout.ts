import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

/** Where the checkout page sends the tenant back to: a screen that steps back to the stay. */
export const staysReturn = () => Linking.createURL('/stays/paid');

/** Opens the checkout page in the system browser and waits until it sends the tenant back or they close it. */
export async function openStaysCheckout(url: string): Promise<void> {
  await WebBrowser.openAuthSessionAsync(url, staysReturn());
}
