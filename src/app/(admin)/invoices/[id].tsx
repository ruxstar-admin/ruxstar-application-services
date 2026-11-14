import { Needs } from '@/features/admin/components/parts';
import { InvoiceScreen } from '@/features/invoices/screens/InvoiceScreen';

export default function ConsoleInvoiceRoute() {
  return (
    <Needs need="orders.view">
      <InvoiceScreen audience="staff" />
    </Needs>
  );
}
