import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { ChatService } from '@/services/chat-service';
import type { ChatPerson } from '@/types/chat';

const TITLE_MAX = 60;
const GROUP_MAX = 50;

/** A chat's details: mute, the people in it, and for group admins renaming, adding, removing and making admins. */
export function ChatInfoScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: chat, loading, error, reload, setData } = useAsyncResource(() => ChatService.get(token, id), id);
  useRefetchOnFocus(reload);

  const [title, setTitle] = useState<string | null>(null);
  const [picked, setPicked] = useState<ChatPerson | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const run = async (task: () => Promise<unknown>, after?: () => void) => {
    setBusy(true);
    setFailure(null);
    try {
      await task();
      Feedback.success();
      after?.();
    } catch (err) {
      Feedback.error();
      setFailure(err instanceof ApiError && err.message ? err.message : 'That did not work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const openProfile = (username: string) => router.push({ pathname: '/(customer)/user/[id]', params: { id: username } });
  const group = chat?.kind === 'group';
  const draft = title ?? chat?.title ?? '';

  return (
    <ScreenContainer title="Details">
      <AsyncBoundary loading={loading} error={error} hasData={!!chat} onRetry={reload}>
        {chat ? (
          <>
            <View style={styles.top}>
              {group ? (
                <View style={styles.groupIcon}>
                  <Ionicons name="people" size={32} color={Brand.primarySoft} />
                </View>
              ) : (
                <Avatar name={chat.title} uri={chat.peer?.avatarUrl} size={72} />
              )}
              <Text style={styles.name}>{chat.title}</Text>
              <Text style={styles.sub}>{group ? `${chat.members} people` : chat.peer ? `@${chat.peer.username}` : ''}</Text>
            </View>

            {group && chat.admin ? (
              <View style={styles.rename}>
                <InputField label="Group name" value={draft} onChangeText={setTitle} maxLength={TITLE_MAX} />
                {title !== null && title.trim() && title.trim() !== chat.title ? (
                  <PrimaryButton
                    label="Save name"
                    loading={busy}
                    onPress={() => run(async () => setData(await ChatService.rename(token, id, title.trim())), () => setTitle(null))}
                  />
                ) : null}
              </View>
            ) : null}

            <ToggleRow
              title="Mute"
              subtitle="Its messages don't add to your badge"
              value={chat.muted}
              onValueChange={(muted) => {
                setData({ ...chat, muted });
                ChatService.mute(token, id, muted).catch(() => {
                  Feedback.error();
                  setData({ ...chat, muted: !muted });
                });
              }}
            />

            {!group && chat.peer ? (
              <>
                <ListRow icon="person-circle-outline" title="View profile" subtitle="Block or report them from there" onPress={() => openProfile(chat.peer!.username)} />
              </>
            ) : null}

            {group ? (
              <>
                <Text style={styles.section}>People</Text>
                {chat.admin && chat.members < GROUP_MAX ? (
                  <ListRow
                    icon="person-add-outline"
                    title="Add people"
                    onPress={() => router.push({ pathname: '/(customer)/chat/new', params: { add: id, size: String(chat.members) } })}
                  />
                ) : null}
                {chat.people.map((person) => (
                  <ListRow
                    key={person.id}
                    leading={<Avatar name={person.name || person.username} uri={person.avatarUrl} size={40} />}
                    title={person.me ? 'You' : person.name || person.username}
                    subtitle={`@${person.username}`}
                    right={
                      <View style={styles.tags}>
                        {person.admin ? <Badge label="Admin" tone="accent" /> : null}
                        {person.state === 'request' ? <Badge label="Invited" /> : null}
                      </View>
                    }
                    onPress={person.me ? undefined : () => (chat.admin ? setPicked(person) : openProfile(person.username))}
                  />
                ))}
                <ListRow icon="exit-outline" title="Leave group" destructive onPress={() => setLeaving(true)} />
              </>
            ) : null}

            {failure ? <ErrorBanner message={failure} /> : null}
          </>
        ) : null}
      </AsyncBoundary>

      <BottomSheet visible={picked !== null} onClose={() => setPicked(null)} title={picked?.name || picked?.username}>
        {picked ? (
          <>
            <ListRow icon="person-circle-outline" title="View profile" onPress={() => (setPicked(null), openProfile(picked.username))} />
            {!picked.admin && picked.state === 'active' ? (
              <ListRow
                icon="shield-checkmark-outline"
                title="Make admin"
                onPress={() => {
                  setPicked(null);
                  run(async () => setData(await ChatService.makeAdmin(token, id, picked.id)));
                }}
              />
            ) : null}
            <ListRow
              icon="person-remove-outline"
              title="Remove from group"
              destructive
              onPress={() => {
                setPicked(null);
                run(() => ChatService.removePerson(token, id, picked.id), reload);
              }}
            />
          </>
        ) : null}
      </BottomSheet>

      <ConfirmSheet
        visible={leaving}
        title="Leave this group?"
        message="You'll stop getting its messages. Someone can add you again."
        confirmLabel="Leave"
        loading={busy}
        onCancel={() => setLeaving(false)}
        onConfirm={() =>
          run(
            () => ChatService.leave(token, id),
            () => {
              setLeaving(false);
              router.dismissTo('/(customer)/(tabs)/messages');
            },
          )
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.three },
  groupIcon: { width: 72, height: 72, borderRadius: Radius.pill, backgroundColor: 'rgba(180,92,242,0.14)', alignItems: 'center', justifyContent: 'center' },
  name: { ...Typography.heading, color: Brand.text, marginTop: Spacing.two },
  sub: { ...Typography.caption, color: Brand.textMuted },
  rename: { gap: Spacing.two },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.three },
  tags: { flexDirection: 'row', gap: Spacing.one },
});
