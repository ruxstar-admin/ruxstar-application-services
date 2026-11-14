import { apiGet, apiGetPage, apiGetText, apiPatch } from '@/lib/api-client';
import type { GstModule, GstModulePatch, GstModuleSettings, GstSellerPatch, GstSellerSettings, GstSettings, Invoice, InvoiceAudience, InvoiceFilter } from '@/types/invoice';

const BASE: Record<InvoiceAudience, string> = {
  customer: '/v1/account/invoices',
  vendor: '/v1/vendor/invoices',
  staff: '/v1/ruxstar/invoices',
};

/** A year of documents can be a large file. */
const EXPORT_TIMEOUT_MS = 60_000;

/**
 * GST invoices, bills of supply and credit notes: a customer's (`/v1/account`), a business's sales (`/v1/vendor`)
 * or every one (`/v1/ruxstar`). Each view carries a short-lived signed `pdfUrl`, so the PDF opens without the token.
 */
export const InvoiceService = {
  list: (token: string, audience: InvoiceAudience, filter: InvoiceFilter = {}, cursor?: string) => apiGetPage<Invoice>(BASE[audience], token, { ...filter, cursor }),
  get: (token: string, audience: InvoiceAudience, id: string) => apiGet<Invoice>(`${BASE[audience]}/${encodeURIComponent(id)}`, token),
  /** A business's documents issued from `from` to `to` (YYYY-MM-DD, India time, up to a year) as CSV, for GST returns. */
  exportCsv: (token: string, range: { from: string; to: string }, business?: string) =>
    apiGetText('/v1/vendor/invoices/export', token, { ...range, business }, { timeoutMs: EXPORT_TIMEOUT_MS }),
};

/** The console's GST settings. Reading needs `modules.view`, changing them `modules.manage`; every change is audited. */
export const GstService = {
  settings: (token: string) => apiGet<GstSettings>('/v1/ruxstar/gst', token),
  updateModule: (token: string, module: GstModule, patch: GstModulePatch, idempotencyKey: string) =>
    apiPatch<GstModuleSettings>(`/v1/ruxstar/gst/modules/${module}`, { ...patch }, token, { idempotencyKey }),
  /** `gstin: null` or `address: null` clears it. */
  updateSeller: (token: string, patch: GstSellerPatch, idempotencyKey: string) =>
    apiPatch<GstSellerSettings>('/v1/ruxstar/gst/seller', { ...patch }, token, { idempotencyKey }),
};
