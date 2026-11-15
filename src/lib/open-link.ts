import { Linking } from 'react-native';

/** Web pages, calls, mail and map apps. Anything else in data the API passes on (`intent:`, `javascript:`, other apps' schemes) is never opened. */
const OPENABLE = /^(https?:\/\/[^\s/?#]+|(tel|mailto|geo|maps):\S)/i;

/** The link trimmed, when it's safe to hand to the phone; null otherwise. */
export function openableUrl(url: string | null | undefined): string | null {
  const link = url?.trim();
  return link && OPENABLE.test(link) ? link : null;
}

/** Opens a link that came from someone else, such as an organiser's meeting link. False when it was refused or couldn't open. */
export async function openLink(url: string | null | undefined): Promise<boolean> {
  const link = openableUrl(url);
  if (!link) return false;
  try {
    await Linking.openURL(link);
    return true;
  } catch {
    return false;
  }
}
