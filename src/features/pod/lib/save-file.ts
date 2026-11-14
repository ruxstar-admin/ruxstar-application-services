import { shareFromLink } from '@/lib/share-file';
import type { PrintFile } from '@/types/order';

/** Saves an order's file from its signed link and opens the share sheet to keep, send on or print it. */
export const saveFile = (url: string, file: PrintFile) => shareFromLink(url, { folder: ['print-files', file.id], name: file.name || 'print-file', mimeType: file.contentType });
