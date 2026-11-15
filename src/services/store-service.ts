import { apiDelete, apiGet, apiGetPage, apiPatch, apiPost, apiPut, apiPutBytes, type WriteOptions } from '@/lib/api-client';
import type { AssignChoice, DeliveryOptions } from '@/types/order';
import type { MyReview, Review } from '@/types/review';
import type {
  BannedCategory,
  ConsoleProduct,
  ConsoleProductsQuery,
  ConsoleReturnDecision,
  ConsoleStore,
  ConsoleStoreOne,
  ConsoleStoreOrder,
  ConsoleStoreOrdersQuery,
  ConsoleStoresQuery,
  DeskStore,
  DeskStoreOrder,
  DeskStoreOrdersView,
  MoveStatus,
  MyStoreOrdersView,
  PlaceStoreOrderBody,
  ProductBody,
  ProductCard,
  ProductDetail,
  ProductPatch,
  ProductsQuery,
  QuoteBody,
  ReturnReason,
  StoreCard,
  StoreDetail,
  StoreOrder,
  StoreQuote,
  StoreRules,
  StoreSetupBody,
  StoreSetupOne,
  StoresQuery,
  VendorProduct,
  VendorProductsQuery,
} from '@/types/store';

const id = (value: string) => encodeURIComponent(value);
type Done = { done: true };
const trimmed = (text: string | undefined) => text?.trim() || undefined;

/** `/v1/shop`: local shops, their products, pricing the cart, ordering and paying, the customer's orders, returns and product reviews. */
export const StoreService = {
  rules: (token: string) => apiGet<StoreRules>('/v1/shop/rules', token),
  list: (token: string, query: StoresQuery, cursor?: string) =>
    apiGetPage<StoreCard>('/v1/shop', token, { city: trimmed(query.city), type: query.type, q: trimmed(query.q), cursor }),
  get: (token: string, storeId: string) => apiGet<StoreDetail>(`/v1/shop/${id(storeId)}`, token),
  products: (token: string, query: ProductsQuery, cursor?: string) =>
    apiGetPage<ProductCard>('/v1/shop/products', token, {
      city: trimmed(query.city),
      shop: query.shop,
      q: trimmed(query.q),
      inStock: query.inStock === undefined ? undefined : String(query.inStock),
      cursor,
    }),
  product: (token: string, productId: string) => apiGet<ProductDetail>(`/v1/shop/products/${id(productId)}`, token),
  productReviews: (token: string, productId: string, cursor?: string, limit?: number) =>
    apiGetPage<Review>(`/v1/shop/products/${id(productId)}/reviews`, token, { cursor, limit }),
  /** Prices the cart as it is now: stock per line, delivery for the address so far, coupons and `checked` for `code`. */
  quote: (token: string, storeId: string, body: QuoteBody) => apiPost<StoreQuote>(`/v1/shop/${id(storeId)}/quote`, { ...body }, token),
  place: (token: string, storeId: string, body: PlaceStoreOrderBody, options: WriteOptions) =>
    apiPost<{ order: StoreOrder; checkoutUrl: string }>(`/v1/shop/${id(storeId)}/orders`, { ...body }, token, options),
  orders: (token: string, view: MyStoreOrdersView, cursor?: string) => apiGetPage<StoreOrder>('/v1/shop/orders', token, { view, cursor }),
  /** While it waits for payment, the API asks Cashfree whether it was paid. */
  order: (token: string, orderId: string) => apiGet<StoreOrder>(`/v1/shop/orders/${id(orderId)}`, token),
  pay: (token: string, orderId: string, returnTo: string) => apiPost<{ checkoutUrl: string }>(`/v1/shop/orders/${id(orderId)}/pay`, { returnTo }, token),
  /** Always a full refund. */
  cancel: (token: string, orderId: string, reason: string | undefined, options: WriteOptions) =>
    apiPost<StoreOrder>(`/v1/shop/orders/${id(orderId)}/cancel`, reason ? { reason } : {}, token, options),
  /** Leaving out `lines` returns everything. */
  requestReturn: (token: string, orderId: string, body: { reason: ReturnReason; note?: string; lines?: { lineId: string; quantity: number }[] }, options: WriteOptions) =>
    apiPost<StoreOrder>(`/v1/shop/orders/${id(orderId)}/return`, { ...body }, token, options),
  /** One product of a delivered order, in the shape `RateOrderCard` takes; `orderId` is the order. */
  productReview: (productId: string) => ({
    mine: (token: string, orderId: string) => apiGet<MyReview | null>(`/v1/shop/orders/${id(orderId)}/products/${id(productId)}/review`, token),
    write: (token: string, orderId: string, body: { rating: number; text?: string | null }) =>
      apiPut<MyReview>(`/v1/shop/orders/${id(orderId)}/products/${id(productId)}/review`, token, { ...body }),
    remove: (token: string, orderId: string) => apiDelete<Done>(`/v1/shop/orders/${id(orderId)}/products/${id(productId)}/review`, token),
  }),
};

/** `/v1/vendor`: the owner's shop setup and products, with the photo. */
export const VendorStoreService = {
  setup: (token: string, businessId: string) => apiGet<StoreSetupOne>(`/v1/vendor/businesses/${id(businessId)}/shop`, token),
  saveSetup: (token: string, businessId: string, body: StoreSetupBody) => apiPut<StoreSetupOne>(`/v1/vendor/businesses/${id(businessId)}/shop`, token, { ...body }),
  products: (token: string, businessId: string, query: VendorProductsQuery, cursor?: string) =>
    apiGetPage<VendorProduct>(`/v1/vendor/businesses/${id(businessId)}/products`, token, { ...query, q: trimmed(query.q), cursor }),
  create: (token: string, businessId: string, body: ProductBody, options: WriteOptions) =>
    apiPost<VendorProduct>(`/v1/vendor/businesses/${id(businessId)}/products`, { ...body }, token, options),
  get: (token: string, productId: string) => apiGet<VendorProduct>(`/v1/vendor/products/${id(productId)}`, token),
  update: (token: string, productId: string, changes: ProductPatch) => apiPatch<VendorProduct>(`/v1/vendor/products/${id(productId)}`, { ...changes }, token),
  remove: (token: string, productId: string) => apiDelete<Done>(`/v1/vendor/products/${id(productId)}`, token),
  setPhoto: (token: string, productId: string, jpeg: Uint8Array<ArrayBuffer>) =>
    apiPutBytes<VendorProduct>(`/v1/vendor/products/${id(productId)}/photo`, { data: jpeg, type: 'image/jpeg' }, token),
  removePhoto: (token: string, productId: string) => apiDelete<VendorProduct>(`/v1/vendor/products/${id(productId)}/photo`, token),
};

/** `/v1/shop/desk`: the orders queue, moving and delivering orders, returns and stock, for the owner and their team. */
export const StoreDeskService = {
  stores: (token: string) => apiGetPage<DeskStore>('/v1/shop/desk/stores', token).then((p) => p.items),
  orders: (token: string, storeId: string, view: DeskStoreOrdersView, cursor?: string) =>
    apiGetPage<DeskStoreOrder>(`/v1/shop/desk/stores/${id(storeId)}/orders`, token, { view, cursor }),
  order: (token: string, orderId: string) => apiGet<DeskStoreOrder>(`/v1/shop/desk/orders/${id(orderId)}`, token),
  /** One step at a time; a rider's trip moves it by itself. */
  move: (token: string, orderId: string, status: MoveStatus, options: WriteOptions) =>
    apiPost<DeskStoreOrder>(`/v1/shop/desk/orders/${id(orderId)}/move`, { status }, token, options),
  /** Always a full refund; the customer is told the reason. */
  cancel: (token: string, orderId: string, reason: string, options: WriteOptions) =>
    apiPost<DeskStoreOrder>(`/v1/shop/desk/orders/${id(orderId)}/cancel`, { reason }, token, options),
  deliveryOptions: (token: string, orderId: string) => apiGet<DeliveryOptions>(`/v1/shop/desk/orders/${id(orderId)}/delivery`, token),
  assign: (token: string, orderId: string, choice: AssignChoice, options: WriteOptions) =>
    apiPost<DeskStoreOrder>(`/v1/shop/desk/orders/${id(orderId)}/delivery`, { ...choice }, token, options),
  cancelDelivery: (token: string, orderId: string) => apiDelete<DeskStoreOrder>(`/v1/shop/desk/orders/${id(orderId)}/delivery`, token),
  /** A note is needed to reject; the customer reads it. */
  decideReturn: (token: string, orderId: string, decision: 'approve' | 'reject', note: string | undefined, options: WriteOptions) =>
    apiPost<DeskStoreOrder>(`/v1/shop/desk/orders/${id(orderId)}/return/decide`, { decision, ...(note ? { note } : {}) }, token, options),
  /** The items are back: refunds the customer. */
  received: (token: string, orderId: string, note: string | undefined, options: WriteOptions) =>
    apiPost<DeskStoreOrder>(`/v1/shop/desk/orders/${id(orderId)}/return/received`, note ? { note } : {}, token, options),
  products: (token: string, storeId: string, query: VendorProductsQuery, cursor?: string) =>
    apiGetPage<VendorProduct>(`/v1/shop/desk/stores/${id(storeId)}/products`, token, { ...query, q: trimmed(query.q), cursor }),
  update: (token: string, productId: string, changes: ProductPatch) => apiPatch<VendorProduct>(`/v1/shop/desk/products/${id(productId)}`, { ...changes }, token),
  /** Each variant set to the number given. */
  stock: (token: string, productId: string, variants: { variantId: string; stock: number }[]) =>
    apiPut<VendorProduct>(`/v1/shop/desk/products/${id(productId)}/stock`, token, { variants }),
};

/** `/v1/ruxstar/shop`: every shop, product and order, taking products down, returns, and the banned categories. */
export const ConsoleStoreService = {
  stores: (token: string, query: ConsoleStoresQuery, cursor?: string) =>
    apiGetPage<ConsoleStore>('/v1/ruxstar/shop/stores', token, { city: trimmed(query.city), q: trimmed(query.q), cursor }),
  store: (token: string, storeId: string) => apiGet<ConsoleStoreOne>(`/v1/ruxstar/shop/stores/${id(storeId)}`, token),
  products: (token: string, query: ConsoleProductsQuery, cursor?: string) =>
    apiGetPage<ConsoleProduct>('/v1/ruxstar/shop/products', token, { ...query, city: trimmed(query.city), q: trimmed(query.q), cursor }),
  product: (token: string, productId: string) => apiGet<ConsoleProduct>(`/v1/ruxstar/shop/products/${id(productId)}`, token),
  /** The shop is told the reason; placed orders go on. */
  takeDown: (token: string, productId: string, reason: string, key: string) =>
    apiPost<ConsoleProduct>(`/v1/ruxstar/shop/products/${id(productId)}/take-down`, { reason }, token, { idempotencyKey: key }),
  banned: (token: string) => apiGetPage<BannedCategory>('/v1/ruxstar/shop/banned', token).then((p) => p.items),
  addBanned: (token: string, body: { key: string; name: string; words: string[] }, key: string) =>
    apiPost<BannedCategory>('/v1/ruxstar/shop/banned', { ...body }, token, { idempotencyKey: key }),
  updateBanned: (token: string, bannedKey: string, patch: { name?: string; words?: string[]; active?: boolean }) =>
    apiPatch<BannedCategory>(`/v1/ruxstar/shop/banned/${id(bannedKey)}`, { ...patch }, token),
  orders: (token: string, query: ConsoleStoreOrdersQuery, cursor?: string) => apiGetPage<ConsoleStoreOrder>('/v1/ruxstar/shop/orders', token, { ...query, cursor }),
  order: (token: string, orderId: string) => apiGet<ConsoleStoreOrder>(`/v1/ruxstar/shop/orders/${id(orderId)}`, token),
  /** A full refund; the customer and the shop are told the reason. */
  cancel: (token: string, orderId: string, reason: string, key: string) =>
    apiPost<ConsoleStoreOrder>(`/v1/ruxstar/shop/orders/${id(orderId)}/cancel`, { reason }, token, { idempotencyKey: key }),
  /** Both sides read the note. */
  decideReturn: (token: string, orderId: string, decision: ConsoleReturnDecision, note: string, key: string) =>
    apiPost<ConsoleStoreOrder>(`/v1/ruxstar/shop/orders/${id(orderId)}/return`, { decision, note }, token, { idempotencyKey: key }),
};
