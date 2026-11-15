import { useLocalSearchParams } from 'expo-router';
import { CourtFormScreen } from '@/features/turf/screens/CourtFormScreen';

export default function CourtRoute() {
  const { id, courtId } = useLocalSearchParams<{ id: string; courtId?: string }>();
  return <CourtFormScreen groundId={id} courtId={courtId} />;
}
