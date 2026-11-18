import { Needs } from '@/features/admin/components/parts';
import { GigOrdersScreen } from '@/features/admin/screens/GigOrdersScreen';

export default function GigOrdersRoute() {
  return (
    <Needs need="orders.view">
      <GigOrdersScreen />
    </Needs>
  );
}
