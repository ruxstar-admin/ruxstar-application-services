import type { Author, Page } from './social';

export type ChatKind = 'dm' | 'group';
export type MessageKind = 'text' | 'post' | 'photo' | 'event';
/** `request`: someone you don't follow started it or added you. It sits in Requests until you accept. */
export type ChatState = 'active' | 'request';
export type ChatBox = 'chats' | 'requests';

export interface ChatPreview {
  kind: MessageKind;
  /** Ready to show, e.g. "Sent a photo". */
  text: string;
  mine: boolean;
  at: string;
}

export interface Chat {
  id: string;
  kind: ChatKind;
  /** The group's name, or the other person's name. */
  title: string;
  /** 1:1 chats only. */
  peer: Author | null;
  members: number;
  state: ChatState;
  muted: boolean;
  unread: number;
  /** Groups: you can add and remove people, rename it and make admins. */
  admin: boolean;
  canSend: boolean;
  /** 1:1: your request isn't accepted yet and you've sent your one message. */
  waiting: boolean;
  last: ChatPreview | null;
  createdAt: string;
}

export interface ChatPerson extends Author {
  admin: boolean;
  state: ChatState;
  me: boolean;
}

export interface ChatDetail extends Chat {
  /** You first. */
  people: ChatPerson[];
  /** 1:1: when the other person last read it. */
  seenAt: string | null;
}

export interface SharedPost {
  id: string;
  /** False when the post was deleted or you can't see its author. */
  available: boolean;
  author: Author | null;
  text: string;
  photo: string | null;
}

export interface ChatPhoto {
  url: string;
  width: number;
  height: number;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  kind: MessageKind;
  /** Null for group lines like "Asha added Ravi". */
  sender: Author | null;
  mine: boolean;
  text: string;
  post: SharedPost | null;
  photo: ChatPhoto | null;
  createdAt: string;
}

/** Local-only send state for optimistic messages; confirmed messages have none. */
export type SendState = 'sending' | 'failed';

export interface PendingMessage extends ChatMessage {
  sendState?: SendState;
  /** Kept for retries, so a retried send is applied once. */
  idempotencyKey?: string;
  /** A photo still uploading: the picked file, shown until the server's copy arrives. */
  upload?: { uri: string; width: number; height: number };
}

export interface ChatUpdates {
  /** Oldest first; may repeat a few already held. */
  messages: ChatMessage[];
  unsent: string[];
  seenAt: string | null;
  /** The name, people or admins changed. */
  changed: boolean;
  /** Pass back as `since` next time. */
  now: string;
}

export interface ChatUnread {
  unread: number;
  requests: number;
}

export interface Contact {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

export type ChatPage = Page<Chat>;
