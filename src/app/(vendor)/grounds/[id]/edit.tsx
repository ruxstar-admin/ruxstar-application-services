import { useLocalSearchParams } from 'expo-router';
import { GroundFormScreen } from '@/features/turf/screens/GroundFormScreen';

export default function EditGroundRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <GroundFormScreen groundId={id} />;
}
