import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Brand, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { UsernameField } from '@/features/auth/components/UsernameField';
import { useUsernameCheck } from '@/features/auth/hooks/use-username-check';
import { MAX_NAME_LENGTH, isValidEmail, isValidName, isValidUsername, nameError } from '@/features/auth/lib/validators';
import { CityField } from '@/features/profile/components/CityField';
import { EmailVerifySheet } from '@/features/profile/components/EmailVerifySheet';
import { ProfilePhotoPicker } from '@/features/profile/components/ProfilePhotoPicker';
import { useProfilePhoto } from '@/features/profile/hooks/use-profile-photo';
import { BIO_LINES, BIO_MAX, limitBio } from '@/features/profile/lib/bio';
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
  VALIDATION_FAILED: 'Some details are not valid. Check them and try again.',
};

/** `focus` opens the screen with that field active, for the Profile tab's "Add a bio" and "Add your city". */
export type EditProfileFocus = 'bio' | 'city';

function EditProfileForm({ profile, focus }: { profile: Profile; focus?: EditProfileFocus }) {
  const router = useRouter();
  const token = useAuthToken();
  const phone = useAuthStore((s) => s.mobile) ?? '';
  const setName = useAuthStore((s) => s.setName);
  const savedName = profile.name;

  const [name, setNameInput] = useState(savedName);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [email, setEmail] = useState(profile.email);
  const [city, setCity] = useState(profile.city);
  const [gender, setGender] = useState<Gender | undefined>(profile.gender);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(profile.emailVerified);
  const [verifying, setVerifying] = useState(false);
  const photo = useProfilePhoto(profile.avatarUrl);

  // Only a changed username needs an availability check; your current one is always yours.
  const usernameChanged = username !== profile.username;
  const usernameCheck = useUsernameCheck(usernameChanged ? username : '');
  const usernameOk = !usernameChanged || usernameCheck.status === 'available';

  const changes: ProfileUpdate = {
    ...(name.trim() !== savedName ? { name: name.trim() } : {}),
    ...(usernameChanged ? { username } : {}),
    ...(bio.trim() !== profile.bio ? { bio: bio.trim() } : {}),
    ...(email.trim() !== profile.email ? { email: email.trim() } : {}),
    ...(city.trim() !== profile.city ? { city: city.trim() } : {}),
    ...(gender !== profile.gender ? { gender } : {}),
  };
  const dirty = Object.keys(changes).length > 0;
  const savedEmail = profile.email.length > 0 && email.trim() === profile.email;
  const emailHint = !savedEmail
    ? email.trim() && isValidEmail(email.trim())
      ? 'Save, then verify it with a code we email you.'
      : undefined
    : emailVerified
      ? 'Verified.'
      : 'Not verified yet. We will email you a 6-digit code.';
  const emailAccessory = !savedEmail ? null : emailVerified ? (
    <Ionicons name="checkmark-circle" size={22} color={Brand.success} accessibilityLabel="Email verified" />
  ) : (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Verify email"
      hitSlop={8}
      onPress={() => {
        Feedback.select();
        setVerifying(true);
      }}
      style={({ pressed }) => [styles.verify, pressed && styles.verifyPressed]}
    >
      <Text style={styles.verifyText}>Verify</Text>
    </Pressable>
  );
  const valid = isValidName(name) && isValidUsername(username) && usernameOk && isValidEmail(email.trim()) && city.trim().length !== 1;

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
        <ProfilePhotoPicker name={name || 'You'} photo={photo} />
      </View>

      <InputField
        label="Name"
        value={name}
        onChangeText={setNameInput}
        autoCapitalize="words"
        maxLength={MAX_NAME_LENGTH}
        error={nameError(name) ?? undefined}
      />
      <UsernameField value={username} onChange={setUsername} check={usernameCheck} />
      <InputField
        label="Bio"
        value={bio}
        onChangeText={(text) => setBio(limitBio(text))}
        multiline
        maxLength={BIO_MAX}
        showCount
        hint={`Up to ${BIO_LINES} lines.`}
        placeholder="What you do, teach or sell"
        autoFocus={focus === 'bio'}
      />
      <CityField value={city} onChange={setCity} autoFocus={focus === 'city'} />

      <Text style={styles.section}>Private information</Text>
      <Text style={styles.note}>Your email, phone and gender are never shown on your profile.</Text>
      <InputField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        hint={emailHint}
        accessory={emailAccessory}
        error={email.length > 0 && !isValidEmail(email) ? 'Enter a valid email address.' : undefined}
      />
      <InputField label="Phone" value={`+91 ${phone}`} editable={false} hint="Contact support to change your number." />
      <Text style={styles.fieldLabel}>Gender</Text>
      <SegmentedTabs options={GENDERS} value={gender} onChange={setGender} />

      {failure ? <ErrorBanner message={failure} onRetry={save} /> : null}

      <EmailVerifySheet
        visible={verifying}
        onClose={() => setVerifying(false)}
        onVerified={(updated) => {
          setEmailVerified(updated.emailVerified);
          setVerifying(false);
        }}
      />
    </ScreenContainer>
  );
}

export function EditProfileScreen() {
  const token = useAuthToken();
  const { focus } = useLocalSearchParams<{ focus?: EditProfileFocus }>();
  const { data, loading, error, reload } = useAsyncResource(() => ProfileService.getMe(token));

  return data ? (
    <EditProfileForm profile={data} focus={focus} />
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
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.three },
  note: { ...Typography.caption, color: Brand.textFaint },
  fieldLabel: { ...Typography.caption, color: Brand.textMuted },
  verify: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyPressed: { backgroundColor: Brand.surfaceAlt, transform: [{ scale: 0.96 }] },
  verifyText: { fontFamily: Fonts.semibold, fontSize: 13, color: Brand.primarySoft },
});
