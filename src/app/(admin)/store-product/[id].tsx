import { useLocalSearchParams } from 'expo-router';
import { Needs } from '@/features/admin/components/parts';
import { StoreProductCaseScreen } from '@/features/admin/screens/StoreProductCaseScreen';

export default function StoreProductRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Needs need="businesses.view">
      <StoreProductCaseScreen id={id} />
    </Needs>
  );
}
