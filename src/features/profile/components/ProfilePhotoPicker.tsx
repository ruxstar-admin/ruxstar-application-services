import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import type { useProfilePhoto } from '@/features/profile/hooks/use-profile-photo';

interface ProfilePhotoPickerProps {
  name: string;
  photo: ReturnType<typeof useProfilePhoto>;
  size?: number;
}

/** The avatar with "Choose photo" and "Remove" under it. */
export function ProfilePhotoPicker({ name, photo, size = 88 }: ProfilePhotoPickerProps) {
  const box = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={styles.container}>
      <View>
        <Avatar name={name} uri={photo.uri} size={size} />
        {photo.busy ? (
          <View style={[styles.busy, box]} accessibilityLabel="Saving photo">
            <ActivityIndicator color={Brand.text} />
          </View>
        ) : null}
      </View>
      {photo.busy ? null : (
        <View style={styles.actions}>
          <TextLink label={photo.hasPhoto ? 'Change photo' : 'Choose photo'} onPress={photo.choose} />
          {photo.hasPhoto ? <TextLink muted label="Remove" onPress={photo.remove} /> : null}
        </View>
      )}
      {photo.error ? <Text style={styles.error}>{photo.error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: Spacing.two },
  busy: { position: 'absolute', top: 0, left: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four, minHeight: 24 },
  error: { ...Typography.caption, color: Brand.error, textAlign: 'center' },
});
