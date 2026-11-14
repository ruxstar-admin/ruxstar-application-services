import { Needs } from '@/features/admin/components/parts';
import { InvoicesScreen } from '@/features/admin/screens/InvoicesScreen';

export default function ConsoleInvoicesRoute() {
  return (
    <Needs need="orders.view">
      <InvoicesScreen />
    </Needs>
  );
}
