import { Needs } from '@/features/admin/components/parts';
import { StoreOrdersScreen } from '@/features/admin/screens/StoreOrdersScreen';

export default function StoreOrdersRoute() {
  return (
    <Needs need="orders.view">
      <StoreOrdersScreen />
    </Needs>
  );
}
