import * as Clipboard from 'expo-clipboard';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ListRow } from '@/components/ui/ListRow';
import { stampLabel } from '@/features/chat/lib/thread-layout';
import { Feedback } from '@/lib/haptics';
import type { PendingMessage } from '@/types/chat';

interface MessageMenuProps {
  message: PendingMessage | null;
  onClose: () => void;
  onUnsend: (message: PendingMessage) => void;
}

/** What you get when you hold a message: when it was sent, Copy, and Unsend for your own. */
export function MessageMenu({ message, onClose, onUnsend }: MessageMenuProps) {
  const copy = async () => {
    if (!message?.text) return;
    await Clipboard.setStringAsync(message.text);
    Feedback.success();
    onClose();
  };

  return (
    <BottomSheet visible={!!message} onClose={onClose} title={message ? `Sent ${stampLabel(message.createdAt)}` : undefined}>
      {message?.text ? <ListRow icon="copy-outline" title="Copy text" onPress={copy} /> : null}
      {message?.mine ? (
        <ListRow
          icon="arrow-undo-outline"
          title="Unsend"
          subtitle="Removes it for everyone in this chat"
          destructive
          onPress={() => {
            onClose();
            onUnsend(message);
          }}
        />
      ) : null}
    </BottomSheet>
  );
}
