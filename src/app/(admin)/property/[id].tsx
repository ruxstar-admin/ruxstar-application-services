import { useLocalSearchParams } from 'expo-router';
import { Needs } from '@/features/admin/components/parts';
import { PropertyCaseScreen } from '@/features/admin/screens/PropertyCaseScreen';

export default function PropertyRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Needs need="businesses.view">
      <PropertyCaseScreen id={id} />
    </Needs>
  );
}
