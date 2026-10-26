import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { ContactPicker } from '@/features/chat/components/ContactPicker';
import { CapabilityToggles } from '@/features/vendor/components/CapabilityToggles';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { VendorService } from '@/services/vendor-service';
import type { Contact } from '@/types/chat';
import type { ModuleKey } from '@/types/vendor';

/** This business's module. Becomes a choice once a vendor runs more than one (Phase 8). */
const MODULE: ModuleKey = 'pod';

/** Invite someone: pick the person, choose what they may do, send. They accept from their notifications. */
export function InviteStaffScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const [person, setPerson] = useState<Contact | null>(null);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!person) return;
    setBusy(true);
    setError(null);
    try {
      await VendorService.invite(token, { userId: person.id, name: person.name, username: person.username }, MODULE, capabilities);
      Feedback.success();
      router.back();
    } catch (err) {
      Feedback.error();
      setError(err instanceof ApiError && err.kind === 'conflict' ? `${person.name} is already on your team.` : 'Could not send the invite. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer
      title="Invite staff"
      footer={person ? <PrimaryButton label={`Send invite to ${person.name}`} onPress={send} loading={busy} disabled={capabilities.length === 0} /> : undefined}
    >
      {person ? (
        <>
          <View style={styles.chosen}>
            <Avatar name={person.name} size={44} />
            <View style={styles.flex}>
              <Text style={styles.name}>{person.name}</Text>
              <Text style={styles.sub}>@{person.username}</Text>
            </View>
            <TextLink label="Change" onPress={() => setPerson(null)} />
          </View>
          <Text style={styles.note}>Permissions turn on once they accept and their identity is verified.</Text>
          <CapabilityToggles module={MODULE} granted={capabilities} onChange={setCapabilities} />
          {error ? <ErrorBanner message={error} onRetry={send} /> : null}
        </>
      ) : (
        <ContactPicker onSelect={setPerson} />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chosen: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  name: { ...Typography.body, color: Brand.text },
  sub: { ...Typography.caption, color: Brand.textMuted },
  note: { ...Typography.caption, color: Brand.textMuted },
});
