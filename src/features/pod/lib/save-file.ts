import { Linking } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { PrintFile } from '@/types/order';

/**
 * Saves an order's file from its signed link: into the app, then the share sheet to keep it in Files
 * or Drive, send it on, or print it. Where there is no share sheet, the browser downloads it.
 */
export async function saveFile(url: string, file: PrintFile) {
  if (!(await Sharing.isAvailableAsync())) {
    await Linking.openURL(`${url}&download=1`);
    return;
  }
  const folder = new Directory(Paths.cache, 'print-files', file.id);
  folder.create({ idempotent: true, intermediates: true });
  const name = file.name.replace(/[\\/:*?"<>|]/g, '_') || 'print-file';
  const saved = await File.downloadFileAsync(url, new File(folder, name), { idempotent: true });
  await Sharing.shareAsync(saved.uri, { mimeType: file.contentType, dialogTitle: file.name, UTI: file.contentType === 'application/pdf' ? 'com.adobe.pdf' : undefined });
}
