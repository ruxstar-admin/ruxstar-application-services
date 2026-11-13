import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { ContactPicker } from '@/features/chat/components/ContactPicker';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { ChatService } from '@/services/chat-service';
import type { ChatDetail, Contact } from '@/types/chat';

const MODES = [
  { key: 'direct', label: 'Direct' },
  { key: 'group', label: 'New group' },
] as const;
/** Everyone in a group, you included. */
const GROUP_MAX = 50;
const TITLE_MAX = 60;

const failureOf = (err: unknown) =>
  err instanceof ApiError && err.code !== 'INTERNAL' && err.message ? err.message : 'Could not start the chat. Please try again.';

/**
 * Start a 1:1 chat or a group. Opened with `add=<chatId>` it adds people to that group instead.
 * People who don't follow you get it as a request.
 */
export function NewChatScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { add, size } = useLocalSearchParams<{ add?: string; size?: string }>();
  const adding = !!add;
  const [mode, setMode] = useState<(typeof MODES)[number]['key']>(adding ? 'group' : 'direct');
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const room = GROUP_MAX - (adding ? Number(size) || 1 : 1);

  const run = async (task: () => Promise<ChatDetail>) => {
    setBusy(true);
    setFailure(null);
    try {
      const chat = await task();
      Feedback.success();
      if (adding) router.back();
      else router.replace({ pathname: '/(customer)/chat/[id]', params: { id: chat.id, title: chat.title } });
    } catch (err) {
      Feedback.error();
      setFailure(failureOf(err));
      setBusy(false);
    }
  };

  const toggle = (contact: Contact) =>
    setMembers((prev) => {
      const next = new Set(prev);
      if (!next.delete(contact.id) && next.size < room) next.add(contact.id);
      return next;
    });

  const multi = adding || mode === 'group';
  const full = members.size >= room;
  const canCreate = members.size > 0 && (adding || groupName.trim().length > 0);
  const label = adding ? `Add ${members.size || ''}`.trim() : members.size > 0 ? `Create group (${members.size})` : 'Create group';

  return (
    <ScreenContainer
      title={adding ? 'Add people' : 'New chat'}
      footer={
        multi ? (
          <PrimaryButton
            label={label}
            disabled={!canCreate}
            loading={busy}
            onPress={() =>
              run(() => (adding ? ChatService.addPeople(token, add!, [...members]) : ChatService.createGroup(token, groupName.trim(), [...members])))
            }
          />
        ) : undefined
      }
    >
      {adding ? null : <SegmentedTabs options={MODES} value={mode} onChange={setMode} />}
      {mode === 'group' && !adding ? (
        <InputField label="Group name" value={groupName} onChangeText={setGroupName} maxLength={TITLE_MAX} placeholder="e.g. Pottery batch 5" />
      ) : null}
      {multi ? (
        <View style={styles.hints}>
          {full ? <Text style={styles.full}>{`A group holds up to ${GROUP_MAX} people.`}</Text> : null}
          <Text style={styles.hint}>{"People who don't follow you get an invite in their Requests and join when they accept."}</Text>
        </View>
      ) : null}
      <ContactPicker
        selected={multi ? members : undefined}
        onSelect={multi ? toggle : (contact) => !busy && run(() => ChatService.startDm(token, contact.id))}
      />
      {failure ? <ErrorBanner message={failure} /> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hints: { gap: Spacing.one },
  full: { ...Typography.caption, color: Brand.warning },
  hint: { ...Typography.caption, color: Brand.textMuted },
});
