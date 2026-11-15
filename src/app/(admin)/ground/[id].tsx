import { useLocalSearchParams } from 'expo-router';
import { Needs } from '@/features/admin/components/parts';
import { GroundCaseScreen } from '@/features/admin/screens/GroundCaseScreen';

export default function GroundRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Needs need="businesses.view">
      <GroundCaseScreen id={id} />
    </Needs>
  );
}
