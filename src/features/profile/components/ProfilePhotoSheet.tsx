import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { Avatar } from '@/components/ui/Avatar';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useProfilePhoto } from '@/features/profile/hooks/use-profile-photo';

const MAX_PHOTO = 360;

interface ProfilePhotoSheetProps {
  visible: boolean;
  onClose: () => void;
  name: string;
  avatarUrl?: string;
  /** Called after a photo is saved or removed, so the screen can refetch. */
  onChanged: () => void;
}

function PhotoBody({ name, avatarUrl, onChanged }: Omit<ProfilePhotoSheetProps, 'visible' | 'onClose'>) {
  const photo = useProfilePhoto(avatarUrl);
  const { width } = useWindowDimensions();
  const size = Math.min(width - Spacing.three * 2, MAX_PHOTO);

  const run = (action: () => Promise<void>) => async () => {
    await action();
    onChanged();
  };

  return (
    <>
      <View style={styles.frame}>
        {photo.uri ? (
          <Image
            source={{ uri: photo.uri }}
            style={{ width: size, height: size, borderRadius: Radius.xl }}
            contentFit="cover"
            transition={200}
            accessibilityLabel={`${name}'s profile photo`}
          />
        ) : (
          <View style={[styles.empty, { width: size, height: size }]}>
            <Avatar name={name} size={Math.round(size * 0.45)} />
            <Text style={styles.emptyText}>A photo helps people recognise you when you book or sell.</Text>
          </View>
        )}
        {photo.busy ? (
          <View style={[styles.busy, { width: size, height: size }]} accessibilityLabel="Saving photo">
            <ActivityIndicator color={Brand.text} size="large" />
          </View>
        ) : null}
      </View>

      {photo.error ? <Text style={styles.error}>{photo.error}</Text> : null}

      <PrimaryButton label={photo.hasPhoto ? 'Change photo' : 'Choose photo'} onPress={run(photo.choose)} disabled={photo.busy} />
      {photo.hasPhoto ? (
        <View style={styles.remove}>
          <TextLink muted label="Remove photo" onPress={run(photo.remove)} />
        </View>
      ) : null}
    </>
  );
}

/** Your photo at full width, with change and remove. Opened by tapping the avatar on your profile. */
export function ProfilePhotoSheet({ visible, onClose, name, avatarUrl, onChanged }: ProfilePhotoSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Profile photo">
      <PhotoBody key={avatarUrl ?? 'none'} name={name} avatarUrl={avatarUrl} onChanged={onChanged} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  frame: { alignSelf: 'center', marginBottom: Spacing.two },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.xl,
    backgroundColor: Brand.surfaceAlt,
  },
  emptyText: { ...Typography.caption, color: Brand.textMuted, textAlign: 'center' },
  busy: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.xl,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  error: { ...Typography.caption, color: Brand.error, textAlign: 'center' },
  remove: { alignItems: 'center', paddingVertical: Spacing.two },
});
