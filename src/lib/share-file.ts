import { Linking } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const UTI: Record<string, string> = { 'application/pdf': 'com.adobe.pdf', 'text/csv': 'public.comma-separated-values-text' };
const safeName = (name: string) => name.replace(/[\\/:*?"<>|]/g, '_') || 'file';

/**
 * Saves a file from a signed link into the app, then opens the share sheet to keep it in Files or Drive, send it on,
 * or print it. The link needs no sign-in, so no token leaves the app. Where there is no share sheet, the browser downloads it.
 */
export async function shareFromLink(url: string, { folder, name, mimeType }: { folder: string[]; name: string; mimeType: string }) {
  if (!(await Sharing.isAvailableAsync())) {
    await Linking.openURL(`${url}&download=1`);
    return;
  }
  const dir = new Directory(Paths.cache, ...folder);
  dir.create({ idempotent: true, intermediates: true });
  const saved = await File.downloadFileAsync(url, new File(dir, safeName(name)), { idempotent: true });
  await Sharing.shareAsync(saved.uri, { mimeType, dialogTitle: name, UTI: UTI[mimeType] });
}

/** Writes text, such as a CSV export, to a file and opens the share sheet. False where there is no share sheet. */
export async function shareText(text: string, { name, mimeType }: { name: string; mimeType: string }): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const file = new File(Paths.cache, safeName(name));
  if (file.exists) file.delete();
  file.create();
  file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name, UTI: UTI[mimeType] });
  return true;
}
