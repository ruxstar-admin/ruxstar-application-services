import type { Author, Page } from './social';

export type ChatKind = 'dm' | 'group';
export type MessageKind = 'text' | 'post' | 'photo' | 'voice' | 'event';
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
  /** 1:1: when the other person last had Ruxstar open, once they've accepted. */
  activeAt: string | null;
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

/** AAC in MP4; `levels` are 0-100 loudness bars for its waveform (may be empty). */
export interface ChatVoice {
  url: string;
  durationMs: number;
  levels: number[];
}

/** What a reply shows of the message it answers. */
export interface ReplyPreview {
  id: string;
  /** False once that message was unsent. */
  available: boolean;
  /** Their name, or "You". */
  sender: string;
  mine: boolean;
  kind: MessageKind;
  text: string;
}

export interface ReactionCount {
  emoji: string;
  count: number;
  /** This one is yours. One reaction per person. */
  mine: boolean;
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
  voice: ChatVoice | null;
  replyTo: ReplyPreview | null;
  reactions: ReactionCount[];
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
  /** A voice message still uploading: the recording on the phone. */
  recording?: { uri: string; durationMs: number; levels: number[] };
}

export interface ChatUpdates {
  /** Oldest first; may repeat a few already held. */
  messages: ChatMessage[];
  /** Older messages whose reactions changed. */
  updated: ChatMessage[];
  unsent: string[];
  seenAt: string | null;
  activeAt: string | null;
  /** Others typing right now. */
  typing: Author[];
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
