import type { SearchResult, SearchScope } from '@/types/social';
import { defineMocks } from './registry';

/** People search is real (`/v1/account/profiles`); these scopes wait for their modules. */
const SEARCH_INDEX: SearchResult[] = [
  { id: 'sunrise', scope: 'businesses', title: 'Sunrise Print Works', subtitle: 'Print on demand · Hyderabad' },
  { id: 'b2', scope: 'businesses', title: 'Claymate Studio', subtitle: 'Pottery workshops · Hyderabad' },
  { id: 'ev1', scope: 'events', title: 'Open mic night', subtitle: 'Banjara Hills · free' },
  { id: 'ev2', scope: 'events', title: 'Weekend flea market', subtitle: 'Madhapur · ₹50' },
  { id: 'co2', scope: 'courses', title: 'UPSC prelims crash course', subtitle: 'Exam prep · Batch 7' },
  { id: 'co1', scope: 'courses', title: 'Wheel pottery basics', subtitle: 'Arts & crafts · Batch 4' },
  { id: 'pg1', scope: 'stays', title: 'Green Nest PG', subtitle: 'Madhapur · from ₹450 / night' },
];

const text = (body: Record<string, unknown> | undefined, key: string) => String(body?.[key] ?? '');

defineMocks({
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

  /** Employment offers arrive with the vendor team module. */
  'POST /notifications/respond': {
    mocked: true,
    handle: ({ body }) => ({ message: body?.accept === true ? 'Accepted' : 'Declined' }),
  },
});
