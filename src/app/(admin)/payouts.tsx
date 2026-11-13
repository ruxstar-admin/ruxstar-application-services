import { Needs } from '@/features/admin/components/parts';
import { PayoutsScreen } from '@/features/admin/screens/PayoutsScreen';

export default function PayoutsRoute() {
  return (
    <Needs need="payouts.view">
      <PayoutsScreen />
    </Needs>
  );
}
