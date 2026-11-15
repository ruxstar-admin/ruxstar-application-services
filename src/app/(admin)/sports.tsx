import { Needs } from '@/features/admin/components/parts';
import { SportsScreen } from '@/features/admin/screens/SportsScreen';

export default function SportsRoute() {
  return (
    <Needs need="businesses.view">
      <SportsScreen />
    </Needs>
  );
}
