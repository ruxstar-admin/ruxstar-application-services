import { useLocalSearchParams } from 'expo-router';
import { GroundFormScreen } from '@/features/turf/screens/GroundFormScreen';

/** The business id comes in as `id`; the form reads it as `businessId`. */
export default function NewGroundRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <GroundFormScreen businessId={id} />;
}
