import { useState } from 'react';
import { pickSquarePhoto, toUploadJpeg } from '@/features/profile/lib/profile-photo';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { ProfileService } from '@/services/profile-service';

const PHOTO_ERRORS: Record<string, string> = {
  PHOTO_INVALID: 'That photo could not be used. Try a different one.',
  PAYLOAD_TOO_LARGE: 'That photo is too large. Try a different one.',
  PHOTO_UNAVAILABLE: 'Photos cannot be saved right now. Try again shortly.',
  RATE_LIMITED: 'You have changed your photo a lot. Try again later.',
};

/** Choose, upload and remove your profile photo. While uploading, `uri` shows the local copy. */
export function useProfilePhoto(initialUrl?: string) {
  const token = useAuthToken();
  const [url, setUrl] = useState(initialUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fail = (err: unknown, fallback: string) => {
    Feedback.error();
    setError((err instanceof ApiError && PHOTO_ERRORS[err.code]) || fallback);
  };

  const choose = async () => {
    setError(null);
    const asset = await pickSquarePhoto().catch(() => null);
    if (!asset) return;
    setPreview(asset.uri);
    setBusy(true);
    try {
      const profile = await ProfileService.setPhoto(token, await toUploadJpeg(asset));
      setUrl(profile.avatarUrl);
      Feedback.success();
    } catch (err) {
      fail(err, 'Could not save your photo. Please try again.');
    } finally {
      setPreview(null);
      setBusy(false);
    }
  };

  const remove = async () => {
    setError(null);
    setBusy(true);
    try {
      await ProfileService.removePhoto(token);
      setUrl(undefined);
      Feedback.success();
    } catch (err) {
      fail(err, 'Could not remove your photo. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return { uri: preview ?? url, hasPhoto: !!url, busy, error, choose, remove };
}
