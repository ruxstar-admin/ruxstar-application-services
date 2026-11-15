import { Needs } from '@/features/admin/components/parts';
import { StoreProductsScreen } from '@/features/admin/screens/StoreProductsScreen';

export default function StoreProductsRoute() {
  return (
    <Needs need="businesses.view">
      <StoreProductsScreen />
    </Needs>
  );
}
