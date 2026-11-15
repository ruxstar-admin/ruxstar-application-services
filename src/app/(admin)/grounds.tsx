import { Needs } from '@/features/admin/components/parts';
import { GroundsScreen } from '@/features/admin/screens/GroundsScreen';

export default function GroundsRoute() {
  return (
    <Needs need="businesses.view">
      <GroundsScreen />
    </Needs>
  );
}
