import { apiPost } from '@/lib/api-client';
import type { ChatMessage, Contact, Conversation } from '@/types/chat';
import type { ReportReason } from '@/types/profile';

type Message = { message: string };

/** Direct messages, groups and communities. None exist in the backend yet — all mocked (chat.mocks.ts). */
export const ChatService = {
  conversations: (token: string) => apiPost<Conversation[]>('/chat/conversations', undefined, token),
  discoverCommunities: (token: string) => apiPost<Conversation[]>('/chat/communities/discover', undefined, token),
  joinCommunity: (token: string, id: string) => apiPost<Conversation>('/chat/communities/join', { id }, token),
  leaveCommunity: (token: string, id: string) => apiPost<Message>('/chat/communities/leave', { id }, token),

  /** `after` = id of the newest message already held; returns only newer ones. Omit for the latest 50. */
  messages: (token: string, id: string, after?: string) => apiPost<ChatMessage[]>('/chat/messages', { id, after }, token),
  send: (token: string, id: string, text: string) => apiPost<ChatMessage>('/chat/send', { id, text }, token),
  markRead: (token: string, id: string) => apiPost<Message>('/chat/read', { id }, token),
  unreadTotal: (token: string) => apiPost<{ count: number }>('/chat/unread-total', undefined, token),

  contacts: (token: string, q: string) => apiPost<Contact[]>('/chat/contacts', { q }, token),
  startDm: (token: string, userId: string) => apiPost<Conversation>('/chat/dm/start', { userId }, token),
  createGroup: (token: string, name: string, memberIds: string[]) =>
    apiPost<Conversation>('/chat/group/create', { name, memberIds }, token),

  reportMessage: (token: string, messageId: string, reason: ReportReason) =>
    apiPost<Message>('/chat/report', { messageId, reason }, token),
};
