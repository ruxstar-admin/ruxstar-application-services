import { apiPost } from '@/lib/api-client';
import type { Fulfilment, PodOrder, PrintShop, PrintSpecs, UploadedFile } from '@/types/pod';

/** Print-on-demand. Not in the backend yet — mocked (pod.mocks.ts). Pricing is authoritative server-side. */
export const PodService = {
  shop: (token: string, id: string) => apiPost<PrintShop>('/pod/shop', { id }, token),
  upload: (token: string, name: string, uri: string) => apiPost<UploadedFile>('/pod/upload', { name, uri }, token),
  placeOrder: (
    token: string,
    order: { shopId: string; fileId: string; fileName: string; specs: PrintSpecs; fulfilment: Fulfilment; address?: string; paymentRef: string },
  ) => apiPost<PodOrder>('/pod/order', order, token),
  order: (token: string, id: string) => apiPost<PodOrder>('/pod/order/get', { id }, token),

  vendorOrders: (token: string) => apiPost<PodOrder[]>('/pod/vendor/orders', undefined, token),
  advance: (token: string, id: string) => apiPost<PodOrder>('/pod/vendor/advance', { id }, token),
};
