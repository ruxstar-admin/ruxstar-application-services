import { apiDelete, apiGet, apiGetPage, apiPatch, apiPost, apiPostBytes, apiPut } from '@/lib/api-client';
import { ProfileService } from '@/services/profile-service';
import { toAuthor, type ApiAuthor } from '@/services/social-service';
import type {
  Chat,
  ChatBox,
  ChatDetail,
  ChatMessage,
  ChatPerson,
  ChatUnread,
  ChatUpdates,
  Contact,
} from '@/types/chat';
import type { Page } from '@/types/social';

interface ApiChat extends Omit<Chat, 'peer'> {
  peer: ApiAuthor | null;
}
interface ApiChatPerson extends ApiAuthor {
  admin: boolean;
  state: ChatPerson['state'];
  me: boolean;
}
interface ApiChatDetail extends ApiChat {
  people: ApiChatPerson[];
  seenAt: string | null;
}
interface ApiMessage extends Omit<ChatMessage, 'sender' | 'post'> {
  sender: ApiAuthor | null;
  post: (Omit<NonNullable<ChatMessage['post']>, 'author'> & { author: ApiAuthor | null }) | null;
}
interface ApiUpdates extends Omit<ChatUpdates, 'messages'> {
  messages: ApiMessage[];
}

type Done = { done: true };

const toChat = ({ peer, ...rest }: ApiChat): Chat => ({ ...rest, peer: peer ? toAuthor(peer) : null });
const toDetail = ({ people, seenAt, ...chat }: ApiChatDetail): ChatDetail => ({
  ...toChat(chat),
  seenAt,
  people: people.map(({ admin, state, me, ...author }) => ({ ...toAuthor(author), admin, state, me })),
});
const toMessage = ({ sender, post, ...rest }: ApiMessage): ChatMessage => ({
  ...rest,
  sender: sender ? toAuthor(sender) : null,
  post: post ? { ...post, author: post.author ? toAuthor(post.author) : null } : null,
});

const mapPage = async <A, B>(page: Promise<Page<A>>, map: (a: A) => B): Promise<Page<B>> => {
  const { items, nextCursor } = await page;
  return { items: items.map(map), nextCursor };
};

const BASE = '/v1/social/chats';
const chat = (id: string) => `${BASE}/${encodeURIComponent(id)}`;
/** Photos can take a while on a slow connection. */
const PHOTO_TIMEOUT_MS = 60_000;

/** 1:1 chats, private groups and message requests (`/v1/social/chats`). New messages come by polling. */
export const ChatService = {
  list: (token: string, box: ChatBox, cursor?: string, limit?: number) => mapPage(apiGetPage<ApiChat>(BASE, token, { box, cursor, limit }), toChat),
  /** Unread messages in chats that aren't muted, and requests waiting. */
  unread: (token: string) => apiGet<ChatUnread>(`${BASE}/unread`, token),
  get: async (token: string, id: string) => toDetail(await apiGet<ApiChatDetail>(chat(id), token)),

  /** Newest first. */
  messages: (token: string, id: string, cursor?: string) => mapPage(apiGetPage<ApiMessage>(`${chat(id)}/messages`, token, { cursor }), toMessage),
  /** What changed since `since` (the last answer's `now`). */
  updates: async (token: string, id: string, since: string) => {
    const { messages, ...rest } = await apiGet<ApiUpdates>(`${chat(id)}/updates`, token, { since });
    return { ...rest, messages: messages.map(toMessage) };
  },
  /** Text, a shared post, or both. Reuse the key when retrying. */
  send: async (token: string, id: string, body: { text?: string; postId?: string }, idempotencyKey: string) =>
    toMessage(await apiPost<ApiMessage>(`${chat(id)}/messages`, body, token, { idempotencyKey })),
  /** A JPEG the app has already shrunk. */
  sendPhoto: async (token: string, id: string, jpeg: Uint8Array<ArrayBuffer>, idempotencyKey: string) =>
    toMessage(
      await apiPostBytes<ApiMessage>(`${chat(id)}/photos`, { data: jpeg, type: 'image/jpeg' }, token, {
        headers: { 'Idempotency-Key': idempotencyKey },
        timeoutMs: PHOTO_TIMEOUT_MS,
      }),
    ),
  /** Gone for everyone. */
  unsend: (token: string, id: string, messageId: string) => apiDelete<Done>(`${chat(id)}/messages/${encodeURIComponent(messageId)}`, token),
  markRead: (token: string, id: string) => apiPost<Done>(`${chat(id)}/read`, undefined, token),
  mute: (token: string, id: string, muted: boolean) => apiPut<Done>(`${chat(id)}/mute`, token, { muted }),

  accept: async (token: string, id: string) => toDetail(await apiPost<ApiChatDetail>(`${chat(id)}/accept`, undefined, token)),
  decline: (token: string, id: string) => apiPost<Done>(`${chat(id)}/decline`, undefined, token),

  /** Opens your 1:1 chat with someone, starting it if needed. */
  startDm: async (token: string, userId: string) => toDetail(await apiPost<ApiChatDetail>(`${BASE}/dm`, { userId }, token)),
  createGroup: async (token: string, title: string, userIds: string[]) => toDetail(await apiPost<ApiChatDetail>(`${BASE}/groups`, { title, userIds }, token)),
  rename: async (token: string, id: string, title: string) => toDetail(await apiPatch<ApiChatDetail>(chat(id), { title }, token)),
  addPeople: async (token: string, id: string, userIds: string[]) => toDetail(await apiPost<ApiChatDetail>(`${chat(id)}/people`, { userIds }, token)),
  removePerson: (token: string, id: string, userId: string) => apiDelete<Done>(`${chat(id)}/people/${encodeURIComponent(userId)}`, token),
  makeAdmin: async (token: string, id: string, userId: string) => toDetail(await apiPut<ApiChatDetail>(`${chat(id)}/admins/${encodeURIComponent(userId)}`, token)),
  leave: (token: string, id: string) => apiPost<Done>(`${chat(id)}/leave`, undefined, token),

  /** People to message: People search, which never includes you. */
  contacts: async (token: string, q: string): Promise<Contact[]> =>
    (await ProfileService.search(token, q || undefined)).map(({ id, name, username, avatarUrl }) => ({ id, name, username, avatarUrl })),
};
