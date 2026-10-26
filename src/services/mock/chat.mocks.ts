import { ApiError } from '@/lib/api-error';
import type { ChatMessage, Contact, Conversation } from '@/types/chat';
import { defineMocks } from './registry';

const REPLY_DELAY_MS = 1500;
const MINUTE = 60_000;
const ago = (minutes: number) => new Date(Date.now() - minutes * MINUTE).toISOString();

const CONTACTS: Contact[] = [
  { id: 'priya-nair', name: 'Priya Nair', username: 'priya.star' },
  { id: 'u-rahul', name: 'Rahul Verma', username: 'rahul.v' },
  { id: 'u-meera', name: 'Meera Joshi', username: 'meera.j' },
  { id: 'u-arjun', name: 'Arjun Rao', username: 'arjun.rao' },
  { id: 'u-sana', name: 'Sana Sheikh', username: 'sana.s' },
];

let conversations: Conversation[] = [
  { id: 'dm-priya', kind: 'dm', title: 'Priya Nair', lastMessage: 'See you at the studio on Saturday!', lastAt: ago(12), unread: 2, canPost: true, joined: true },
  { id: 'dm-rahul', kind: 'dm', title: 'Rahul Verma', lastMessage: 'Sent the print files.', lastAt: ago(300), unread: 0, canPost: true, joined: true },
  { id: 'grp-pottery', kind: 'group', title: 'Pottery Batch 4', lastMessage: 'Meera: Bring an apron.', lastAt: ago(45), unread: 5, members: 8, canPost: true, joined: true },
  { id: 'com-makers', kind: 'community', title: 'Hyderabad Makers', lastMessage: 'Weekend market sign-ups are open.', lastAt: ago(180), unread: 1, members: 1240, canPost: false, joined: true },
  { id: 'com-upsc', kind: 'community', title: 'UPSC Aspirants', lastMessage: 'New test series starts Monday.', lastAt: ago(600), unread: 0, members: 5320, canPost: false, joined: false },
  { id: 'com-pg', kind: 'community', title: 'PG & Hostel Finder', lastMessage: 'Beds available near Madhapur.', lastAt: ago(900), unread: 0, members: 860, canPost: false, joined: false },
];

const messages = new Map<string, ChatMessage[]>();
/** Conversations where the other side owes a reply: shown on the next fetch after the delay. */
const owedReplies = new Map<string, number>();
let counter = 0;

const msg = (conversationId: string, who: { id: string; name: string }, text: string, minutesAgo: number): ChatMessage => ({
  id: `${conversationId}-m${++counter}`,
  conversationId,
  author: who,
  text,
  createdAt: ago(minutesAgo),
  mine: who.id === 'me',
});

const ME = { id: 'me', name: 'You' };

const historyFor = (c: Conversation): ChatMessage[] => {
  const other = { id: c.id, name: c.title };
  return [
    msg(c.id, other, 'Hi! Thanks for reaching out.', 120),
    msg(c.id, ME, 'Hello, quick question about the next batch.', 118),
    msg(c.id, other, c.lastMessage, Math.max(1, Math.round((Date.now() - new Date(c.lastAt).getTime()) / MINUTE))),
  ];
};

const thread = (id: string) => {
  const conversation = conversations.find((c) => c.id === id);
  if (!conversation) throw new ApiError(404, 'Conversation not found');
  if (!messages.has(id)) messages.set(id, historyFor(conversation));
  return { conversation, list: messages.get(id) as ChatMessage[] };
};

const text = (body: Record<string, unknown> | undefined, key: string) => String(body?.[key] ?? '');

const settleReplies = (id: string, conversation: Conversation, list: ChatMessage[]) => {
  const due = owedReplies.get(id);
  if (due === undefined || Date.now() < due) return;
  owedReplies.delete(id);
  const reply = msg(id, { id, name: conversation.title }, 'Sounds good, thanks!', 0);
  list.push(reply);
  conversation.lastMessage = reply.text;
  conversation.lastAt = reply.createdAt;
  conversation.unread += 1;
};

defineMocks({
  'POST /chat/conversations': {
    mocked: true,
    handle: () =>
      conversations
        .filter((c) => c.joined)
        .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
        .map((c) => ({ ...c })),
  },

  'POST /chat/communities/discover': { mocked: true, handle: () => conversations.filter((c) => c.kind === 'community' && !c.joined).map((c) => ({ ...c })) },

  'POST /chat/communities/join': {
    mocked: true,
    handle: ({ body }) => {
      const { conversation } = thread(text(body, 'id'));
      conversation.joined = true;
      return { ...conversation };
    },
  },

  'POST /chat/communities/leave': {
    mocked: true,
    handle: ({ body }) => {
      const { conversation } = thread(text(body, 'id'));
      conversation.joined = false;
      return { message: 'Left' };
    },
  },

  'POST /chat/messages': {
    mocked: true,
    latencyMs: 200,
    handle: ({ body }) => {
      const id = text(body, 'id');
      const { conversation, list } = thread(id);
      settleReplies(id, conversation, list);
      const after = body?.after as string | undefined;
      const index = after ? list.findIndex((m) => m.id === after) : -1;
      return index >= 0 ? list.slice(index + 1) : list.slice(-50);
    },
  },

  'POST /chat/send': {
    mocked: true,
    latencyMs: 250,
    handle: ({ body }) => {
      const id = text(body, 'id');
      const { conversation, list } = thread(id);
      if (!conversation.canPost) throw new ApiError(403, 'Only admins can post here');
      const message = msg(id, ME, text(body, 'text'), 0);
      list.push(message);
      conversation.lastMessage = message.text;
      conversation.lastAt = message.createdAt;
      if (conversation.kind === 'dm') owedReplies.set(id, Date.now() + REPLY_DELAY_MS);
      return message;
    },
  },

  'POST /chat/read': {
    mocked: true,
    latencyMs: 80,
    handle: ({ body }) => {
      thread(text(body, 'id')).conversation.unread = 0;
      return { message: 'Read' };
    },
  },

  'POST /chat/unread-total': {
    mocked: true,
    latencyMs: 80,
    handle: () => ({ count: conversations.filter((c) => c.joined).reduce((sum, c) => sum + c.unread, 0) }),
  },

  'POST /chat/contacts': {
    mocked: true,
    latencyMs: 200,
    handle: ({ body }) => {
      const q = text(body, 'q').trim().toLowerCase();
      return CONTACTS.filter((c) => !q || `${c.name} ${c.username}`.toLowerCase().includes(q));
    },
  },

  'POST /chat/dm/start': {
    mocked: true,
    handle: ({ body }) => {
      const contact = CONTACTS.find((c) => c.id === text(body, 'userId'));
      if (!contact) throw new ApiError(404, 'User not found');
      const existing = conversations.find((c) => c.kind === 'dm' && c.title === contact.name);
      if (existing) return { ...existing };
      const created: Conversation = {
        id: `dm-${contact.id}`,
        kind: 'dm',
        title: contact.name,
        lastMessage: '',
        lastAt: new Date().toISOString(),
        unread: 0,
        canPost: true,
        joined: true,
      };
      conversations = [created, ...conversations];
      messages.set(created.id, []);
      return { ...created };
    },
  },

  'POST /chat/group/create': {
    mocked: true,
    handle: ({ body }) => {
      const members = (body?.memberIds as string[] | undefined) ?? [];
      const name = text(body, 'name').trim();
      if (!name || members.length === 0) throw new ApiError(400, 'A group needs a name and members');
      const created: Conversation = {
        id: `grp-${Date.now()}`,
        kind: 'group',
        title: name,
        lastMessage: 'Group created',
        lastAt: new Date().toISOString(),
        unread: 0,
        members: members.length + 1,
        canPost: true,
        joined: true,
      };
      conversations = [created, ...conversations];
      messages.set(created.id, []);
      return { ...created };
    },
  },

  'POST /chat/report': { mocked: true, handle: () => ({ message: 'Report received' }) },
});
