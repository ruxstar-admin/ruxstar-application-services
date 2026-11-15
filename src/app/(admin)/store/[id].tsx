import { useLocalSearchParams } from 'expo-router';
import { Needs } from '@/features/admin/components/parts';
import { StoreCaseScreen } from '@/features/admin/screens/StoreCaseScreen';

export default function StoreRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Needs need="businesses.view">
      <StoreCaseScreen id={id} />
    </Needs>
  );
}
