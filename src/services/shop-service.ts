import { apiGet, apiGetPage } from '@/lib/api-client';
import type { Shop, ShopCard, ShopFilters } from '@/types/shop';

/** `/v1/pod/shops`: live print shops customers can order from. */
export const ShopService = {
  list: (token: string, filters: ShopFilters = {}, cursor?: string) =>
    apiGetPage<ShopCard>('/v1/pod/shops', token, { ...filters, cursor }),
  get: (token: string, id: string) => apiGet<Shop>(`/v1/pod/shops/${encodeURIComponent(id)}`, token),
};
