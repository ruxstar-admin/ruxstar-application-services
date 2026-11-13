import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

let openChatId: string | null = null;

/** The chat on screen right now, whose new messages need no phone notification. */
export const openChat = () => openChatId;

/** Marks the chat as on screen while its screen has focus. */
export function useOpenChat(id: string | undefined) {
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      openChatId = id;
      return () => {
        if (openChatId === id) openChatId = null;
      };
    }, [id]),
  );
}
