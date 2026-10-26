import { ApiError } from '@/lib/api-error';
import type { AppNotification, Author, Comment, Page, Post, SearchResult, SearchScope } from '@/types/social';
import { defineMocks } from './registry';

const PAGE_SIZE = 10;
const MINUTE = 60_000;

const ME: Author = { id: 'me', name: 'You', username: 'you.ster', isVendor: false };

const AUTHORS: Author[] = [
  { id: 'priya-nair', name: 'Priya Nair', username: 'priya.star', isVendor: true },
  { id: 'u-rahul', name: 'Rahul Verma', username: 'rahul.v', isVendor: false },
  { id: 'u-meera', name: 'Meera Joshi', username: 'meera.j', isVendor: true },
  { id: 'u-arjun', name: 'Arjun Rao', username: 'arjun.rao', isVendor: false },
  { id: 'u-sana', name: 'Sana Sheikh', username: 'sana.s', isVendor: true },
  { id: 'u-kiran', name: 'Kiran Patel', username: 'kiran.p', isVendor: false },
];

const TEXTS = [
  'Batch 4 of the pottery workshop starts Saturday. Six seats left.',
  'Fresh stock of A2 matte posters in. Same-day print and pickup before 4 pm.',
  'Just finished my first wheel-thrown bowl. Wobbly, but mine.',
  'Looking for a roommate near Madhapur. PG with a terrace and good wifi.',
  'Open mic night at the studio this Friday. Bring your own mic or borrow ours.',
  'Graduation prints done in under an hour. Thank you for trusting us!',
  'Does anyone know a good coaching batch for UPSC prelims in Hyderabad?',
  'Weekend market was packed. Thanks to everyone who came by.',
];

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * MINUTE).toISOString();

const seedPosts = (): Post[] =>
  Array.from({ length: 45 }, (_, i) => {
    const author = AUTHORS[i % AUTHORS.length];
    return {
      id: `p${i + 1}`,
      author,
      text: TEXTS[i % TEXTS.length],
      images: i % 3 === 0 ? [`https://picsum.photos/seed/ruxstar${i}/800/600`] : [],
      createdAt: hoursAgo(i * 2.5 + 1),
      likes: 5 + ((i * 37) % 400),
      comments: (i * 7) % 30,
      likedByMe: false,
      savedByMe: false,
      mine: false,
    };
  });

let posts = seedPosts();
let nextPostId = 1000;
const commentsByPost = new Map<string, Comment[]>();

const seedComments = (postId: string): Comment[] =>
  Array.from({ length: 14 }, (_, i) => ({
    id: `${postId}-c${i + 1}`,
    author: AUTHORS[(i + 2) % AUTHORS.length],
    text: ['Love this!', 'Count me in.', 'How much for two?', 'Beautiful work.', 'DM sent.'][i % 5],
    createdAt: hoursAgo(i + 0.5),
  }));

let notifications: AppNotification[] = [
  { id: 'n1', kind: 'employment', title: 'Employment offer', body: 'Sunrise Print Works invited you to join as staff.', createdAt: hoursAgo(0.2), read: false, actionable: true },
  { id: 'n2', kind: 'employment', title: 'Employment offer', body: 'Weekend Pottery Studio invited you to join as trainer.', createdAt: hoursAgo(5), read: false, actionable: true },
  { id: 'n3', kind: 'order', title: 'Order update', body: 'Your order is ready for pickup.', createdAt: hoursAgo(1), read: false, actionable: false },
  { id: 'n4', kind: 'class', title: 'Class reminder', body: 'Pottery session starts in 24 hours.', createdAt: hoursAgo(20), read: true, actionable: false },
  { id: 'n5', kind: 'social', title: 'New like', body: 'Priya Nair liked your post.', createdAt: hoursAgo(30), read: true, actionable: false },
];

const SEARCH_INDEX: SearchResult[] = [
  ...AUTHORS.map((a): SearchResult => ({ id: a.id, scope: 'people', title: a.name, subtitle: `@${a.username}` })),
  { id: 'sunrise', scope: 'businesses', title: 'Sunrise Print Works', subtitle: 'Print on demand · Hyderabad' },
  { id: 'b2', scope: 'businesses', title: 'Claymate Studio', subtitle: 'Pottery workshops · Hyderabad' },
  { id: 'ev1', scope: 'events', title: 'Open mic night', subtitle: 'Banjara Hills · free' },
  { id: 'ev2', scope: 'events', title: 'Weekend flea market', subtitle: 'Madhapur · ₹50' },
  { id: 'co2', scope: 'courses', title: 'UPSC prelims crash course', subtitle: 'Exam prep · Batch 7' },
  { id: 'co1', scope: 'courses', title: 'Wheel pottery basics', subtitle: 'Arts & crafts · Batch 4' },
  { id: 'pg1', scope: 'stays', title: 'Green Nest PG', subtitle: 'Madhapur · from ₹450 / night' },
];

const text = (body: Record<string, unknown> | undefined, key: string) => String(body?.[key] ?? '');

const paginate = <T>(items: T[], cursor: string | undefined): Page<T> => {
  const start = cursor ? Number(cursor) : 0;
  const end = start + PAGE_SIZE;
  return { items: items.slice(start, end), nextCursor: end < items.length ? String(end) : null };
};

const findPost = (id: string) => {
  const post = posts.find((p) => p.id === id);
  if (!post) throw new ApiError(404, 'Post not found');
  return post;
};

defineMocks({
  'POST /feed/list': { mocked: true, latencyMs: 450, handle: ({ body }) => paginate(posts, body?.cursor as string | undefined) },

  'POST /posts/get': { mocked: true, handle: ({ body }) => ({ ...findPost(text(body, 'id')) }) },

  'POST /posts/create': {
    mocked: true,
    latencyMs: 600,
    handle: ({ body }) => {
      const post: Post = {
        id: `p${nextPostId++}`,
        author: ME,
        text: text(body, 'text'),
        images: (body?.images as string[] | undefined) ?? [],
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: 0,
        likedByMe: false,
        savedByMe: false,
        mine: true,
      };
      posts = [post, ...posts];
      return post;
    },
  },

  'POST /posts/update': {
    mocked: true,
    handle: ({ body }) => {
      const post = findPost(text(body, 'id'));
      if (!post.mine) throw new ApiError(403, 'Not your post');
      post.text = text(body, 'text');
      return { ...post };
    },
  },

  'POST /posts/delete': {
    mocked: true,
    handle: ({ body }) => {
      const post = findPost(text(body, 'id'));
      if (!post.mine) throw new ApiError(403, 'Not your post');
      posts = posts.filter((p) => p.id !== post.id);
      return { message: 'Deleted' };
    },
  },

  'POST /posts/like': {
    mocked: true,
    latencyMs: 150,
    handle: ({ body }) => {
      const post = findPost(text(body, 'id'));
      const liked = body?.liked === true;
      if (liked !== post.likedByMe) post.likes += liked ? 1 : -1;
      post.likedByMe = liked;
      return { likes: post.likes, likedByMe: post.likedByMe };
    },
  },

  'POST /posts/save': {
    mocked: true,
    latencyMs: 150,
    handle: ({ body }) => {
      const post = findPost(text(body, 'id'));
      post.savedByMe = body?.saved === true;
      return { savedByMe: post.savedByMe };
    },
  },

  'POST /posts/comments': {
    mocked: true,
    handle: ({ body }) => {
      const id = text(body, 'id');
      findPost(id);
      if (!commentsByPost.has(id)) commentsByPost.set(id, seedComments(id));
      return paginate(commentsByPost.get(id) ?? [], body?.cursor as string | undefined);
    },
  },

  'POST /posts/comment': {
    mocked: true,
    handle: ({ body }) => {
      const id = text(body, 'id');
      const post = findPost(id);
      const comment: Comment = { id: `${id}-m${Date.now()}`, author: ME, text: text(body, 'text'), createdAt: new Date().toISOString() };
      commentsByPost.set(id, [comment, ...(commentsByPost.get(id) ?? seedComments(id))]);
      post.comments += 1;
      return comment;
    },
  },

  'POST /posts/report': { mocked: true, handle: ({ body }) => (findPost(text(body, 'id')), { message: 'Report received' }) },

  'POST /search': {
    mocked: true,
    latencyMs: 250,
    handle: ({ body }) => {
      const query = text(body, 'q').trim().toLowerCase();
      const scope = text(body, 'scope') as SearchScope;
      if (query.length < 2) return [];
      return SEARCH_INDEX.filter((r) => r.scope === scope && `${r.title} ${r.subtitle}`.toLowerCase().includes(query));
    },
  },

  'POST /notifications/list': {
    mocked: true,
    handle: ({ body }) => paginate(notifications, body?.cursor as string | undefined),
  },

  'POST /notifications/unread-count': { mocked: true, latencyMs: 100, handle: () => ({ count: notifications.filter((n) => !n.read).length }) },

  'POST /notifications/read': {
    mocked: true,
    latencyMs: 100,
    handle: ({ body }) => {
      const id = body?.id as string | undefined;
      notifications = notifications.map((n) => (!id || n.id === id ? { ...n, read: true } : n));
      return { message: 'Read' };
    },
  },

  'POST /notifications/respond': {
    mocked: true,
    handle: ({ body }) => {
      const id = text(body, 'id');
      if (!notifications.some((n) => n.id === id && n.actionable)) throw new ApiError(404, 'Offer not found');
      notifications = notifications.map((n) => (n.id === id ? { ...n, actionable: false, read: true } : n));
      return { message: body?.accept === true ? 'Accepted' : 'Declined' };
    },
  },
});
