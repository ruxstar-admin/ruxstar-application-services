import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { shareFromLink } from '@/lib/share-file';
import type { GigFile } from '@/types/gigs';

/** The signed link, asking for the file as a download rather than opening it in the browser. */
export const downloadUrl = (url: string) => `${url}${url.includes('?') ? '&' : '?'}download=1`;

/**
 * Saves a file from its signed link and opens the share sheet, so it can be kept in Files or Drive. Without a share
 * sheet the browser downloads it.
 */
export async function openGigFile(file: Pick<GigFile, 'url' | 'name' | 'contentType'>): Promise<void> {
  if (!file.url) return;
  if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
    await WebBrowser.openBrowserAsync(downloadUrl(file.url));
    return;
  }
  await shareFromLink(downloadUrl(file.url), { folder: ['gigs'], name: file.name, mimeType: file.contentType });
}
