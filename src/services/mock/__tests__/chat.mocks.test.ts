import { findMock, runMock } from '..';
import type { ChatMessage, Contact, Conversation } from '@/types/chat';

const call = <T = unknown>(path: string, body?: Record<string, unknown>) => {
  const route = findMock('POST', path, 'auto');
  if (!route) throw new Error(`no mock for ${path}`);
  return runMock({ ...route, latencyMs: 0 }, { path, body }) as Promise<T>;
};

describe('conversations', () => {
  it('lists only joined conversations, and joining a community moves it across', async () => {
    const before = await call<Conversation[]>('/chat/conversations');
    expect(before.every((c) => c.joined)).toBe(true);

    const discover = await call<Conversation[]>('/chat/communities/discover');
    expect(discover.length).toBeGreaterThan(0);
    await call('/chat/communities/join', { id: discover[0].id });

    const after = await call<Conversation[]>('/chat/conversations');
    expect(after.some((c) => c.id === discover[0].id)).toBe(true);
    await call('/chat/communities/leave', { id: discover[0].id });
  });

  it('refuses posting in a broadcast community', async () => {
    await expect(call('/chat/send', { id: 'com-makers', text: 'hi' })).rejects.toMatchObject({ kind: 'forbidden' });
  });
});

describe('messages', () => {
  it('sends a message and returns only newer ones when polling', async () => {
    const initial = await call<ChatMessage[]>('/chat/messages', { id: 'dm-rahul' });
    const sent = await call<ChatMessage>('/chat/send', { id: 'dm-rahul', text: 'ping' });
    const newer = await call<ChatMessage[]>('/chat/messages', { id: 'dm-rahul', after: initial[initial.length - 1].id });
    expect(newer.map((m) => m.id)).toEqual([sent.id]);
    expect(newer[0].mine).toBe(true);
  });

  it('clears unread on read', async () => {
    await call('/chat/read', { id: 'dm-priya' });
    const list = await call<Conversation[]>('/chat/conversations');
    expect(list.find((c) => c.id === 'dm-priya')?.unread).toBe(0);
  });
});

describe('new chats', () => {
  it('reuses an existing DM instead of duplicating it', async () => {
    const first = await call<Conversation>('/chat/dm/start', { userId: 'priya-nair' });
    const second = await call<Conversation>('/chat/dm/start', { userId: 'priya-nair' });
    expect(second.id).toBe(first.id);
  });

  it('needs a name and at least one member for a group', async () => {
    await expect(call('/chat/group/create', { name: '', memberIds: ['u-rahul'] })).rejects.toMatchObject({ kind: 'validation' });
    await expect(call('/chat/group/create', { name: 'Study', memberIds: [] })).rejects.toMatchObject({ kind: 'validation' });
    const group = await call<Conversation>('/chat/group/create', { name: 'Study', memberIds: ['u-rahul', 'u-meera'] });
    expect(group).toMatchObject({ kind: 'group', members: 3 });
  });

  it('filters contacts by search text', async () => {
    const found = await call<Contact[]>('/chat/contacts', { q: 'meera' });
    expect(found.map((c) => c.id)).toEqual(['u-meera']);
  });
});
