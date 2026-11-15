import type { Invoice, InvoiceAudience } from '@/types/invoice';
import { InvoiceService } from '@/services/invoice-service';

export const INVOICE_PATH = {
  customer: '/(customer)/invoices/[id]',
  vendor: '/(vendor)/invoices/[id]',
  staff: '/(admin)/invoices/[id]',
} as const satisfies Record<InvoiceAudience, string>;

const CUSTOMER_ORDER_PATH = {
  pod_order: '/(customer)/pod/order/[id]',
  event_order: '/(customer)/events/ticket/[id]',
  coaching_order: '/(customer)/coaching/enrolment/[id]',
  turf_booking: '/(customer)/turf/booking/[id]',
} as const satisfies Record<Invoice['order']['type'], string>;

/** Where "View order" goes from a document, when the viewer has an order screen for it. */
export function orderHref(invoice: Pick<Invoice, 'order'>, audience: InvoiceAudience) {
  const { type, id } = invoice.order;
  if (audience === 'customer') {
    const pathname = CUSTOMER_ORDER_PATH[type];
    return { pathname, params: { id } } as const;
  }
  if (audience === 'vendor' && type === 'pod_order') return { pathname: '/(vendor)/sale/[id]', params: { id } } as const;
  return null;
}

/**
 * The order's other documents: Ruxstar's fee invoice, and credit notes for refunds. Businesses can't filter by order,
 * so for them this looks through their latest credit notes for ones against this invoice.
 */
export async function relatedInvoices(token: string, audience: InvoiceAudience, invoice: Invoice): Promise<Invoice[]> {
  const others = (items: Invoice[]) => items.filter((d) => d.id !== invoice.id && d.order.id === invoice.order.id);
  if (audience === 'customer') return others((await InvoiceService.list(token, audience, { orderId: invoice.order.id, limit: 50 })).items);
  if (audience === 'staff') {
    return others((await InvoiceService.list(token, audience, { orderNo: invoice.order.orderNo, business: invoice.business.id, limit: 50 })).items);
  }
  if (invoice.kind === 'credit_note' || !invoice.credited) return [];
  const notes = await InvoiceService.list(token, audience, { kind: 'credit_note', business: invoice.business.id, limit: 50 });
  return notes.items.filter((d) => d.against?.id === invoice.id);
}
