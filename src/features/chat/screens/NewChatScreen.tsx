import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { ContactPicker } from '@/features/chat/components/ContactPicker';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { ChatService } from '@/services/chat-service';
import type { Contact, Conversation } from '@/types/chat';

const MODES = [
  { key: 'direct', label: 'Direct' },
  { key: 'group', label: 'New group' },
] as const;

export function NewChatScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const [mode, setMode] = useState<(typeof MODES)[number]['key']>('direct');
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const openThread = (c: Conversation) =>
    router.replace({
      pathname: '/(customer)/chat/[id]',
      params: { id: c.id, title: c.title, kind: c.kind, canPost: String(c.canPost), members: String(c.members ?? '') },
    });

  const run = async (task: () => Promise<Conversation>) => {
    setBusy(true);
    setFailed(false);
    try {
      const conversation = await task();
      Feedback.success();
      openThread(conversation);
    } catch {
      Feedback.error();
      setFailed(true);
      setBusy(false);
    }
  };

  const toggle = (contact: Contact) =>
    setMembers((prev) => {
      const next = new Set(prev);
      if (!next.delete(contact.id)) next.add(contact.id);
      return next;
    });

  const canCreate = groupName.trim().length > 0 && members.size > 0;

  return (
    <ScreenContainer
      title="New chat"
      footer={
        mode === 'group' ? (
          <PrimaryButton
            label={members.size > 0 ? `Create group (${members.size})` : 'Create group'}
            disabled={!canCreate}
            loading={busy}
            onPress={() => run(() => ChatService.createGroup(token, groupName.trim(), [...members]))}
          />
        ) : undefined
      }
    >
      <SegmentedTabs options={MODES} value={mode} onChange={setMode} />
      {mode === 'group' ? <InputField label="Group name" value={groupName} onChangeText={setGroupName} maxLength={40} placeholder="e.g. Pottery Batch 5" /> : null}
      <ContactPicker
        selected={mode === 'group' ? members : undefined}
        onSelect={mode === 'group' ? toggle : (contact) => !busy && run(() => ChatService.startDm(token, contact.id))}
      />
      {failed ? <ErrorBanner message="Could not start the chat. Please try again." /> : null}
    </ScreenContainer>
  );
}
