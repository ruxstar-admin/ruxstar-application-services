import { Needs } from '@/features/admin/components/parts';
import { BannedCategoriesScreen } from '@/features/admin/screens/BannedCategoriesScreen';

export default function BannedRoute() {
  return (
    <Needs need="businesses.view">
      <BannedCategoriesScreen />
    </Needs>
  );
}
