import { Needs } from '@/features/admin/components/parts';
import { FacilitiesScreen } from '@/features/admin/screens/FacilitiesScreen';

export default function FacilitiesRoute() {
  return (
    <Needs need="businesses.view">
      <FacilitiesScreen />
    </Needs>
  );
}
