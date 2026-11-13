import { useLocalSearchParams } from 'expo-router';
import { NewCouponScreen } from '@/features/coupons/screens/NewCouponScreen';

export default function WorkNewCouponRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <NewCouponScreen who="team" placeId={id} />;
}
