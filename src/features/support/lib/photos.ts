import * as ImagePicker from 'expo-image-picker';
import { toUploadJpeg } from '@/features/profile/lib/profile-photo';
import { newIdempotencyKey } from '@/lib/api-client';
import { SupportService } from '@/services/support-service';
import type { TicketDetail } from '@/types/support';
import { PHOTO_SIDE } from './support';

/** The system photo picker, up to `room` photos. It needs no permission. Empty when the user backs out. */
export async function pickPhotos(room: number): Promise<ImagePicker.ImagePickerAsset[]> {
  if (room <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsMultipleSelection: room > 1, selectionLimit: room });
  return result.canceled ? [] : result.assets.slice(0, room);
}

/**
 * Adds photos to the message just sent, one after another, and answers with the ticket after the last one.
 * A photo that fails stops the rest; the message itself is already sent.
 */
export async function attachPhotos(token: string, ticket: TicketDetail, photos: ImagePicker.ImagePickerAsset[]): Promise<TicketDetail> {
  const message = ticket.messages.filter((m) => m.mine).at(-1);
  if (!message || !photos.length) return ticket;
  let latest = ticket;
  for (const photo of photos) {
    latest = await SupportService.addPhoto(token, ticket.id, message.id, await toUploadJpeg(photo, PHOTO_SIDE), newIdempotencyKey());
  }
  return latest;
}
