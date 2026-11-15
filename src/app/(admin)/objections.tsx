import { Needs } from '@/features/admin/components/parts';
import { ObjectionsScreen } from '@/features/admin/screens/ObjectionsScreen';

export default function ObjectionsRoute() {
  return (
    <Needs need="orders.view">
      <ObjectionsScreen />
    </Needs>
  );
}
