import { useLocalSearchParams } from 'expo-router';
import { EventFormScreen } from '@/features/events/screens/EventFormScreen';

export default function EditEventRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EventFormScreen eventId={id} />;
}
