import { apiGet, apiGetPage } from '@/lib/api-client';
import type { PodTerms, Shop, ShopCard, ShopFilters } from '@/types/shop';

/** `/v1/pod/shops`: live print shops customers can order from. */
export const ShopService = {
  list: (token: string, filters: ShopFilters = {}, cursor?: string) =>
    apiGetPage<ShopCard>('/v1/pod/shops', token, { ...filters, cursor }),
  get: (token: string, id: string) => apiGet<Shop>(`/v1/pod/shops/${encodeURIComponent(id)}`, token),
  /** The payment conditions customers see before paying and vendors before opening a shop. */
  terms: (token: string) => apiGet<PodTerms>('/v1/pod/terms', token),
};
