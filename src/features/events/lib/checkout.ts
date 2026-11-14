import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

/** Where the checkout page sends the customer back to: a screen that steps back to the booking. */
export const ticketReturn = () => Linking.createURL('/events/paid');

/** Opens the checkout page in the system browser and waits until it sends the customer back or they close it. */
export async function openTicketCheckout(url: string): Promise<void> {
  await WebBrowser.openAuthSessionAsync(url, ticketReturn());
}
