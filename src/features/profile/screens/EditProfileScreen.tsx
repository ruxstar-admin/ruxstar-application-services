import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { UsernameField } from '@/features/auth/components/UsernameField';
import { useUsernameCheck } from '@/features/auth/hooks/use-username-check';
import { isValidEmail, isValidName, isValidUsername, nameError } from '@/features/auth/lib/validators';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { ProfileService } from '@/services/profile-service';
import { useAuthStore } from '@/stores/auth-store';
import type { Gender, Profile, ProfileUpdate } from '@/types/profile';

const GENDERS = [
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
  { key: 'other', label: 'Other' },
] as const;

const SAVE_ERRORS: Record<string, string> = {
  USERNAME_TAKEN: 'That username is taken. Try another.',
  EMAIL_TAKEN: 'This email is on another account.',
  VALIDATION_FAILED: 'Some details are not valid. Check them and try again.',
};

/** The API takes only http and https links. */
const isValidLink = (link: string) => link.length === 0 || /^https?:\/\/\S+\.\S+$/.test(link);

function EditProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const token = useAuthToken();
  const phone = useAuthStore((s) => s.mobile) ?? '';
  const setName = useAuthStore((s) => s.setName);
  const savedName = profile.name;

  const [name, setNameInput] = useState(savedName);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [link, setLink] = useState(profile.link);
  const [email, setEmail] = useState(profile.email);
  const [gender, setGender] = useState<Gender | undefined>(profile.gender);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // Only a changed username needs an availability check; your current one is always yours.
  const usernameChanged = username !== profile.username;
  const usernameCheck = useUsernameCheck(usernameChanged ? username : '');
  const usernameOk = !usernameChanged || usernameCheck.status === 'available';

  const changes: ProfileUpdate = {
    ...(name.trim() !== savedName ? { name: name.trim() } : {}),
    ...(usernameChanged ? { username } : {}),
    ...(bio.trim() !== profile.bio ? { bio: bio.trim() } : {}),
    ...(link.trim() !== profile.link ? { link: link.trim() } : {}),
    ...(email.trim() !== profile.email ? { email: email.trim() } : {}),
    ...(gender !== profile.gender ? { gender } : {}),
  };
  const dirty = Object.keys(changes).length > 0;
  const valid = isValidName(name) && isValidUsername(username) && usernameOk && isValidEmail(email.trim()) && isValidLink(link.trim());

  const save = async () => {
    setSaving(true);
    setFailure(null);
    try {
      await ProfileService.update(token, changes);
      setName(name.trim());
      Feedback.success();
      router.back();
    } catch (err) {
      Feedback.error();
      setFailure((err instanceof ApiError && SAVE_ERRORS[err.code]) || 'Could not save your changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer title="Edit profile" footer={<PrimaryButton label="Save" onPress={save} disabled={!dirty || !valid} loading={saving} />}>
      <View style={styles.photo}>
        <Avatar name={name || 'You'} uri={profile.avatarUrl} size={88} />
        <Text style={styles.note}>Profile photos are coming soon.</Text>
      </View>

      <InputField label="Name" value={name} onChangeText={setNameInput} autoCapitalize="words" error={nameError(name) ?? undefined} />
      <UsernameField value={username} onChange={setUsername} check={usernameCheck} />
      <InputField label="Bio" value={bio} onChangeText={setBio} multiline maxLength={160} style={styles.bio} />
      <InputField
        label="Link"
        value={link}
        onChangeText={setLink}
        autoCapitalize="none"
        keyboardType="url"
        placeholder="https://"
        error={isValidLink(link.trim()) ? undefined : 'Start the link with https://'}
      />

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

      {failure ? <ErrorBanner message={failure} onRetry={save} /> : null}
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
