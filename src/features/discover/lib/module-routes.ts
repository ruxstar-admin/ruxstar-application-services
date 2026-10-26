import type { Engagement, Listing } from '@/types/commerce';
import type { SearchResult } from '@/types/social';
import type { ModuleKey } from '@/types/vendor';

export interface AppRoute {
  pathname: string;
  params: Record<string, string>;
}

/** Where a Discover listing opens. One entry per module, so adding a module means adding one line. */
export const listingRoute = (listing: Pick<Listing, 'module' | 'id'>): AppRoute => {
  switch (listing.module) {
    case 'pod':
      return { pathname: '/(customer)/pod/shop/[id]', params: { id: listing.id } };
    case 'events':
      return { pathname: '/(customer)/events/[id]', params: { id: listing.id } };
    case 'coaching':
      return { pathname: '/(customer)/coaching/[id]', params: { id: listing.id } };
    case 'pg':
      return { pathname: '/(customer)/stays/[id]', params: { id: listing.id } };
  }
};

/** Where a past purchase opens (its tracking / ticket / booking screen). */
export const engagementRoute = (engagement: Pick<Engagement, 'module' | 'refId'>): AppRoute => {
  switch (engagement.module) {
    case 'pod':
      return { pathname: '/(customer)/pod/order/[id]', params: { id: engagement.refId } };
    case 'events':
      return { pathname: '/(customer)/events/ticket/[id]', params: { id: engagement.refId } };
    case 'coaching':
      return { pathname: '/(customer)/coaching/enrolment/[id]', params: { id: engagement.refId } };
    case 'pg':
      return { pathname: '/(customer)/stays/booking/[id]', params: { id: engagement.refId } };
  }
};

/** Where a search result opens, or undefined when it has no detail screen (businesses that are not a module). */
export const searchRoute = (result: Pick<SearchResult, 'scope' | 'id'>): AppRoute | undefined => {
  switch (result.scope) {
    case 'people':
      return { pathname: '/(customer)/user/[id]', params: { id: result.id } };
    case 'businesses':
      return result.id === 'sunrise' ? listingRoute({ module: 'pod', id: result.id }) : undefined;
    case 'events':
      return listingRoute({ module: 'events', id: result.id });
    case 'courses':
      return listingRoute({ module: 'coaching', id: result.id });
    case 'stays':
      return listingRoute({ module: 'pg', id: result.id });
  }
};

export const MODULE_ICON: Record<ModuleKey, 'print-outline' | 'calendar-outline' | 'school-outline' | 'bed-outline'> = {
  pod: 'print-outline',
  events: 'calendar-outline',
  coaching: 'school-outline',
  pg: 'bed-outline',
};
