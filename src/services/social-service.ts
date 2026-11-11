import { apiDelete, apiGet, apiGetPage, apiPatch, apiPost, apiPostBytes, apiPut } from '@/lib/api-client';
import type { AppNotification, Author, Comment, Page, Post, PostKind, PostPhoto, SearchResult, SearchScope } from '@/types/social';
import type { ReportReason } from '@/types/profile';

interface ApiAuthor {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  vendor: boolean;
  verified: boolean;
}

interface ApiPost {
  id: string;
  author: ApiAuthor;
  kind: PostKind;
  text: string;
  media: PostPhoto[];
  counts: { likes: number; comments: number };
  createdAt: string;
  editedAt: string | null;
  likedByMe: boolean;
  savedByMe: boolean;
  mine: boolean;
}

interface ApiComment {
  id: string;
  author: ApiAuthor;
  text: string;
  createdAt: string;
  mine: boolean;
}

interface ApiNotification {
  id: string;
  kind: 'social' | 'account';
  title: string;
  body: string;
  /** `verification` carries the track (base or vendor) as its id. */
  link: { screen: 'post' | 'verification'; id: string };
  read: boolean;
  createdAt: string;
}

type Done = { done: true };

const toAuthor = (a: ApiAuthor): Author => ({
  id: a.id,
  name: a.name,
  username: a.username,
  avatarUrl: a.avatarUrl ?? undefined,
  isVendor: a.vendor,
  verified: a.verified,
});

const toPost = ({ author, media, counts, ...rest }: ApiPost): Post => ({
  ...rest,
  author: toAuthor(author),
  photos: media,
  likes: counts.likes,
  comments: counts.comments,
});

const toComment = ({ author, ...rest }: ApiComment): Comment => ({ ...rest, author: toAuthor(author) });

const toNotification = (n: ApiNotification): AppNotification => ({
  id: n.id,
  kind: n.kind,
  title: n.title,
  body: n.body,
  createdAt: n.createdAt,
  read: n.read,
  actionable: false,
  ...(n.link.screen === 'post' ? { postId: n.link.id } : { verification: true }),
});

const mapPage = async <A, B>(page: Promise<Page<A>>, map: (a: A) => B): Promise<Page<B>> => {
  const { items, nextCursor } = await page;
  return { items: items.map(map), nextCursor };
};

const path = (id: string) => `/v1/social/posts/${encodeURIComponent(id)}`;

/** Posts, comments and notifications are `/v1/social` and `/v1/notifications`. Search outside People is still mocked. */
export const SocialService = {
  feed: (token: string, cursor?: string) => mapPage(apiGetPage<ApiPost>('/v1/social/feed', token, { cursor }), toPost),
  /** Someone's posts on one profile tab. `ref` is a username or a user id. */
  userPosts: (token: string, ref: string, kind: PostKind, cursor?: string) =>
    mapPage(apiGetPage<ApiPost>(`/v1/social/users/${encodeURIComponent(ref)}/posts`, token, { kind, cursor }), toPost),
  saved: (token: string, cursor?: string) => mapPage(apiGetPage<ApiPost>('/v1/social/saved', token, { cursor }), toPost),
  getPost: async (token: string, id: string) => toPost(await apiGet<ApiPost>(path(id), token)),

  /** A JPEG the app has already shrunk. Returns the id to pass to `createPost`. */
  uploadPhoto: (token: string, jpeg: Uint8Array<ArrayBuffer>) =>
    apiPostBytes<PostPhoto & { id: string }>('/v1/social/media', { data: jpeg, type: 'image/jpeg' }, token),
  createPost: async (token: string, post: { text: string; mediaIds: string[]; kind: PostKind }) =>
    toPost(await apiPost<ApiPost>('/v1/social/posts', post, token)),
  updatePost: async (token: string, id: string, text: string) => toPost(await apiPatch<ApiPost>(path(id), { text }, token)),
  deletePost: (token: string, id: string) => apiDelete<Done>(path(id), token),

  like: (token: string, id: string, liked: boolean) => {
    type LikeState = { likes: number; likedByMe: boolean };
    return liked ? apiPut<LikeState>(`${path(id)}/like`, token) : apiDelete<LikeState>(`${path(id)}/like`, token);
  },
  save: (token: string, id: string, saved: boolean) => {
    type SaveState = { savedByMe: boolean };
    return saved ? apiPut<SaveState>(`${path(id)}/save`, token) : apiDelete<SaveState>(`${path(id)}/save`, token);
  },
  reportPost: (token: string, id: string, reason: ReportReason) => apiPost<Done>(`${path(id)}/report`, { reason }, token),

  comments: (token: string, id: string, cursor?: string) => mapPage(apiGetPage<ApiComment>(`${path(id)}/comments`, token, { cursor }), toComment),
  addComment: async (token: string, id: string, text: string) => toComment(await apiPost<ApiComment>(`${path(id)}/comments`, { text }, token)),
  deleteComment: (token: string, id: string) => apiDelete<Done>(`/v1/social/comments/${encodeURIComponent(id)}`, token),

  search: (token: string, q: string, scope: SearchScope) => apiPost<SearchResult[]>('/search', { q, scope }, token),

  notifications: (token: string, cursor?: string) =>
    mapPage(apiGetPage<ApiNotification>('/v1/notifications', token, { cursor }), toNotification),
  unreadCount: (token: string) => apiGet<{ count: number }>('/v1/notifications/unread-count', token),
  /** One notification, or all of them without an id. */
  markRead: (token: string, id?: string) => apiPost<Done>('/v1/notifications/read', { id }, token),
  respond: (token: string, id: string, accept: boolean) => apiPost<{ message: string }>('/notifications/respond', { id, accept }, token),
};
