import type { VendorProduct } from '@/types/store';

/**
 * Products last seen on the desk's list. The API has no route for one product for the team, so the form opens with the
 * copy the list had; the owner loads it fresh.
 */
const seen = new Map<string, VendorProduct>();

export const rememberProducts = (products: readonly VendorProduct[]) => products.forEach((p) => seen.set(p.id, p));
export const rememberedProduct = (id: string) => seen.get(id);
