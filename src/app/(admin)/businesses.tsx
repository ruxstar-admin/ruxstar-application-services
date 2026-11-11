import { Needs } from '@/features/admin/components/parts';
import { BusinessesScreen } from '@/features/admin/screens/BusinessesScreen';

export default function BusinessesRoute() {
  return (
    <Needs need="businesses.view">
      <BusinessesScreen />
    </Needs>
  );
}
