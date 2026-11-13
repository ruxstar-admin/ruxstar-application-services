import { useLocalSearchParams } from 'expo-router';
import { VendorCouponsScreen } from '@/features/coupons/screens/VendorCouponsScreen';

export default function WorkCouponsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <VendorCouponsScreen placeId={id} />;
}
