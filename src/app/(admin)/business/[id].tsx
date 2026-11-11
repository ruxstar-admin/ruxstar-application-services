import { useLocalSearchParams } from 'expo-router';
import { Needs } from '@/features/admin/components/parts';
import { BusinessCaseScreen } from '@/features/admin/screens/BusinessCaseScreen';

export default function BusinessRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Needs need="businesses.view">
      <BusinessCaseScreen id={id} />
    </Needs>
  );
}
