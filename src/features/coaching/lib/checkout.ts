import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

/** Where the checkout page sends the parent back to: a screen that steps back to the enrolment. */
export const coachingReturn = () => Linking.createURL('/coaching/paid');

/** Opens the checkout page in the system browser and waits until it sends the parent back or they close it. */
export async function openCoachingCheckout(url: string): Promise<void> {
  await WebBrowser.openAuthSessionAsync(url, coachingReturn());
}
