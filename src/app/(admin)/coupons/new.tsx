import { Needs } from '@/features/admin/components/parts';
import { NewCouponScreen } from '@/features/coupons/screens/NewCouponScreen';

export default function NewRuxstarCouponRoute() {
  return (
    <Needs need="coupons.manage">
      <NewCouponScreen who="ruxstar" />
    </Needs>
  );
}
