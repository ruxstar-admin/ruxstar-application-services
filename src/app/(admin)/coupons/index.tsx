import { Needs } from '@/features/admin/components/parts';
import { CouponsScreen } from '@/features/admin/screens/CouponsScreen';

export default function CouponsRoute() {
  return (
    <Needs need="coupons.view">
      <CouponsScreen />
    </Needs>
  );
}
