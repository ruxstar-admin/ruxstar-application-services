import { apiPost } from '@/lib/api-client';
import type { AppNotification, Comment, Page, Post, SearchResult, SearchScope } from '@/types/social';
import type { ReportReason } from '@/types/profile';

type Message = { message: string };

/** Feed, posts, comments, search and notifications. None exist in the backend yet — all mocked (social.mocks.ts). */
export const SocialService = {
  feed: (token: string, cursor?: string) => apiPost<Page<Post>>('/feed/list', { cursor }, token),

  getPost: (token: string, id: string) => apiPost<Post>('/posts/get', { id }, token),
  createPost: (token: string, text: string, images: string[]) => apiPost<Post>('/posts/create', { text, images }, token),
  updatePost: (token: string, id: string, text: string) => apiPost<Post>('/posts/update', { id, text }, token),
  deletePost: (token: string, id: string) => apiPost<Message>('/posts/delete', { id }, token),
  like: (token: string, id: string, liked: boolean) =>
    apiPost<{ likes: number; likedByMe: boolean }>('/posts/like', { id, liked }, token),
  save: (token: string, id: string, saved: boolean) => apiPost<{ savedByMe: boolean }>('/posts/save', { id, saved }, token),
  reportPost: (token: string, id: string, reason: ReportReason) => apiPost<Message>('/posts/report', { id, reason }, token),

  comments: (token: string, id: string, cursor?: string) => apiPost<Page<Comment>>('/posts/comments', { id, cursor }, token),
  addComment: (token: string, id: string, text: string) => apiPost<Comment>('/posts/comment', { id, text }, token),

  search: (token: string, q: string, scope: SearchScope) => apiPost<SearchResult[]>('/search', { q, scope }, token),

  notifications: (token: string, cursor?: string) => apiPost<Page<AppNotification>>('/notifications/list', { cursor }, token),
  unreadCount: (token: string) => apiPost<{ count: number }>('/notifications/unread-count', undefined, token),
  markRead: (token: string, id?: string) => apiPost<Message>('/notifications/read', { id }, token),
  respond: (token: string, id: string, accept: boolean) => apiPost<Message>('/notifications/respond', { id, accept }, token),
};
