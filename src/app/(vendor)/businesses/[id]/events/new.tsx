import { useLocalSearchParams } from 'expo-router';
import { EventFormScreen } from '@/features/events/screens/EventFormScreen';

/** The business id comes in as `id`; the form reads it as `businessId`. */
export default function NewEventRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EventFormScreen businessId={id} />;
}
