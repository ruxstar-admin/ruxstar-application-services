import { Needs } from '@/features/admin/components/parts';
import { GigListingsScreen } from '@/features/admin/screens/GigListingsScreen';

export default function GigListingsRoute() {
  return (
    <Needs need="businesses.view">
      <GigListingsScreen />
    </Needs>
  );
}
