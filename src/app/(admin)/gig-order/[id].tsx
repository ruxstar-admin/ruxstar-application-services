import { useLocalSearchParams } from 'expo-router';
import { Needs } from '@/features/admin/components/parts';
import { GigOrderCaseScreen } from '@/features/admin/screens/GigOrderCaseScreen';

export default function GigOrderRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Needs need="orders.view">
      <GigOrderCaseScreen id={id} />
    </Needs>
  );
}
