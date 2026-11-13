import { useCan } from '@/features/admin/access';
import { Needs } from '@/features/admin/components/parts';
import { ReportsScreen } from '@/features/admin/screens/ReportsScreen';

export default function ReportsTab() {
  const posts = useCan('reports.view');
  const orders = useCan('orders.view');
  return (
    <Needs need={orders && !posts ? 'orders.view' : 'reports.view'}>
      <ReportsScreen />
    </Needs>
  );
}
