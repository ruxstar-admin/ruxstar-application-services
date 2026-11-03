import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { ProfilePhotoPicker } from '@/features/profile/components/ProfilePhotoPicker';
import { useProfilePhoto } from '@/features/profile/hooks/use-profile-photo';
import { useAuthStore } from '@/stores/auth-store';

/** Optional step straight after signup, before the welcome screen. */
export function AddPhotoScreen() {
  const router = useRouter();
  const name = useAuthStore((s) => s.name) ?? '';
  const photo = useProfilePhoto();
  const next = () => router.replace('/(customer)/welcome');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Add a profile photo</Text>
        <Text style={styles.message}>It helps people know it is you. Anyone can see it. You can change it any time.</Text>
        <ProfilePhotoPicker name={name || 'You'} photo={photo} size={140} />
      </View>
      <View style={styles.actions}>
        {photo.hasPhoto ? (
          <PrimaryButton label="Continue" onPress={next} disabled={photo.busy} />
        ) : (
          <>
            <PrimaryButton label="Choose photo" onPress={photo.choose} loading={photo.busy} />
            <View style={styles.skip}>
              <TextLink muted label="Skip for now" onPress={next} />
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg, paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  title: { ...Typography.title, color: Brand.text, textAlign: 'center' },
  message: { ...Typography.body, color: Brand.textMuted, textAlign: 'center', maxWidth: 320 },
  actions: { gap: Spacing.three },
  skip: { alignItems: 'center' },
});
