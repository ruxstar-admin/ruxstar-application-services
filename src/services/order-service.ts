import { File } from 'expo-file-system';
import { apiGet, apiGetPage, apiPost, apiPostBytes, type WriteOptions } from '@/lib/api-client';
import type { Order, OrderAddress, OrderChoice, PrintFile, ProblemKind, Quote, ShopOrder, ShopOrderView, ShopStatus } from '@/types/order';

const UPLOAD_TIMEOUT_MS = 3 * 60_000;
const id = (value: string) => encodeURIComponent(value);

/** `/v1/pod`: a customer's print orders, from upload to delivery. */
export const OrderService = {
  /** Reads a picked file and sends its bytes. The API checks the type and counts PDF pages. */
  upload: async (token: string, file: { uri: string; name: string; mimeType?: string | null }): Promise<PrintFile> => {
    const data = await new File(file.uri).bytes();
    return apiPostBytes<PrintFile>(
      '/v1/pod/files',
      { data, type: file.mimeType || 'application/octet-stream' },
      token,
      { headers: { 'X-File-Name': encodeURIComponent(file.name) }, timeoutMs: UPLOAD_TIMEOUT_MS },
    );
  },
  quote: (token: string, choice: OrderChoice) => apiPost<Quote>('/v1/pod/quote', { ...choice }, token),
  place: (token: string, body: OrderChoice & { address: OrderAddress; note?: string; returnTo: string }, options: WriteOptions) =>
    apiPost<{ order: Order; checkoutUrl: string }>('/v1/pod/orders', { ...body }, token, options),
  /** A fresh checkout link for an order still waiting for payment. */
  pay: (token: string, orderId: string, returnTo: string) => apiPost<{ checkoutUrl: string }>(`/v1/pod/orders/${id(orderId)}/pay`, { returnTo }, token),
  list: (token: string, cursor?: string) => apiGetPage<Order>('/v1/pod/orders', token, { cursor }),
  /** While it waits for payment, the API asks Cashfree whether it was paid. */
  get: (token: string, orderId: string) => apiGet<Order>(`/v1/pod/orders/${id(orderId)}`, token),
  cancel: (token: string, orderId: string, options: WriteOptions) => apiPost<Order>(`/v1/pod/orders/${id(orderId)}/cancel`, undefined, token, options),
  fileLink: (token: string, orderId: string, fileId: string) =>
    apiGet<{ url: string; expiresAt: string }>(`/v1/pod/orders/${id(orderId)}/files/${id(fileId)}`, token),
  /** Within 48 hours of delivery, or once the order is late. One report per order. */
  reportProblem: (token: string, orderId: string, body: { kind: ProblemKind; note: string }, options: WriteOptions) =>
    apiPost<Order>(`/v1/pod/orders/${id(orderId)}/problem`, { ...body }, token, options),
  /** Up to 3, while Ruxstar hasn't settled it. */
  addProblemPhoto: (token: string, orderId: string, jpeg: Uint8Array<ArrayBuffer>, idempotencyKey: string) =>
    apiPostBytes<Order>(`/v1/pod/orders/${id(orderId)}/problem/photos`, { data: jpeg, type: 'image/jpeg' }, token, {
      headers: { 'Idempotency-Key': idempotencyKey },
      timeoutMs: UPLOAD_TIMEOUT_MS,
    }),
};

/** `/v1/vendor/orders`: orders to a vendor's shops, once paid. */
export const ShopOrderService = {
  list: (token: string, filters: { view?: ShopOrderView; business?: string }, cursor?: string) =>
    apiGetPage<ShopOrder>('/v1/vendor/orders', token, { ...filters, cursor }),
  get: (token: string, orderId: string) => apiGet<ShopOrder>(`/v1/vendor/orders/${id(orderId)}`, token),
  move: (token: string, orderId: string, status: ShopStatus, reason: string | undefined, options: WriteOptions) =>
    apiPost<ShopOrder>(`/v1/vendor/orders/${id(orderId)}/status`, { status, ...(reason ? { reason } : {}) }, token, options),
  fileLink: (token: string, orderId: string, fileId: string) =>
    apiGet<{ url: string; expiresAt: string }>(`/v1/vendor/orders/${id(orderId)}/files/${id(fileId)}`, token),
  /** Paise, out of the shop's share, up to `refundable`. The order carries on. */
  refund: (token: string, orderId: string, amount: number, reason: string, options: WriteOptions) =>
    apiPost<ShopOrder>(`/v1/vendor/orders/${id(orderId)}/refund`, { amount, reason }, token, options),
};
