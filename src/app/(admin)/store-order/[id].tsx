import { useLocalSearchParams } from 'expo-router';
import { Needs } from '@/features/admin/components/parts';
import { StoreOrderCaseScreen } from '@/features/admin/screens/StoreOrderCaseScreen';

export default function StoreOrderRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Needs need="orders.view">
      <StoreOrderCaseScreen id={id} />
    </Needs>
  );
}
