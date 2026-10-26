import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Avatar } from '@/components/ui/Avatar';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { UsernameField } from '@/features/auth/components/UsernameField';
import { useUsernameCheck } from '@/features/auth/hooks/use-username-check';
import { isValidEmail, isValidUsername } from '@/features/auth/lib/validators';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { ProfileService } from '@/services/profile-service';
import { useAuthStore } from '@/stores/auth-store';
import type { Gender, Profile } from '@/types/profile';

const GENDERS = [
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
  { key: 'other', label: 'Other' },
] as const;

function EditProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const token = useAuthToken();
  const phone = useAuthStore((s) => s.mobile) ?? '';
  const savedName = useAuthStore((s) => s.name) ?? '';
  const setName = useAuthStore((s) => s.setName);

  const [name, setNameInput] = useState(savedName);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [link, setLink] = useState(profile.link);
  const [email, setEmail] = useState(profile.email);
  const [gender, setGender] = useState<Gender | undefined>(profile.gender);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  // Only a changed username needs an availability check; your current one is always yours.
  const usernameChanged = username !== profile.username;
  const usernameCheck = useUsernameCheck(usernameChanged ? username : '');
  const usernameOk = !usernameChanged || usernameCheck.status === 'available';

  const dirty =
    name !== savedName || usernameChanged || bio !== profile.bio || link !== profile.link || email !== profile.email || gender !== profile.gender || avatarUrl !== profile.avatarUrl;
  const valid = name.trim().length > 0 && isValidUsername(username) && usernameOk && isValidEmail(email);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled) {
      Feedback.select();
      setAvatarUrl(result.assets[0].uri);
    }
  };

  const save = async () => {
    setSaving(true);
    setFailed(false);
    try {
      await ProfileService.update(token, { name: name.trim(), username, bio: bio.trim(), link: link.trim(), email: email.trim(), gender, avatarUrl });
      setName(name.trim());
      Feedback.success();
      router.back();
    } catch {
      Feedback.error();
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer title="Edit profile" footer={<PrimaryButton label="Save" onPress={save} disabled={!dirty || !valid} loading={saving} />}>
      <View style={styles.photo}>
        <Avatar name={name || 'You'} uri={avatarUrl} size={88} />
        <TextLink label="Change profile photo" onPress={pickPhoto} />
      </View>

      <InputField label="Name" value={name} onChangeText={setNameInput} autoCapitalize="words" />
      <UsernameField value={username} onChange={setUsername} check={usernameCheck} />
      <InputField label="Bio" value={bio} onChangeText={setBio} multiline maxLength={160} style={styles.bio} />
      <InputField label="Link" value={link} onChangeText={setLink} autoCapitalize="none" keyboardType="url" placeholder="https://" />

      <Text style={styles.section}>Private information</Text>
      <Text style={styles.note}>Your email, phone and gender are never shown on your profile.</Text>
      <InputField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        error={email.length > 0 && !isValidEmail(email) ? 'Enter a valid email address.' : undefined}
      />
      <InputField label="Phone" value={`+91 ${phone}`} editable={false} hint="Contact support to change your number." />
      <Text style={styles.fieldLabel}>Gender</Text>
      <SegmentedTabs options={GENDERS} value={gender} onChange={setGender} />

      {failed ? <ErrorBanner message="Could not save your changes. Please try again." onRetry={save} /> : null}
    </ScreenContainer>
  );
}

export function EditProfileScreen() {
  const token = useAuthToken();
  const { data, loading, error, reload } = useAsyncResource(() => ProfileService.getMe(token));

  return data ? (
    <EditProfileForm profile={data} />
  ) : (
    <ScreenContainer title="Edit profile">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={5}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  photo: { alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two },
  bio: { height: 96, paddingTop: Spacing.three, textAlignVertical: 'top' },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.three },
  note: { ...Typography.caption, color: Brand.textFaint },
  fieldLabel: { ...Typography.caption, color: Brand.textMuted },
});
