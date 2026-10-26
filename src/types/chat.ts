export type ConversationKind = 'dm' | 'group' | 'community';

export interface Conversation {
  id: string;
  kind: ConversationKind;
  title: string;
  avatarUrl?: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
  /** Groups and communities only. */
  members?: number;
  /** False in a community where only admins may post. */
  canPost: boolean;
  joined: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  author: { id: string; name: string };
  text: string;
  createdAt: string;
  mine: boolean;
}

/** Local-only send state for optimistic messages; confirmed messages have none. */
export type SendState = 'sending' | 'failed';

export interface PendingMessage extends ChatMessage {
  sendState?: SendState;
}

export interface Contact {
  id: string;
  name: string;
  username: string;
}
