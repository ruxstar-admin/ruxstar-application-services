import { useLocalSearchParams } from 'expo-router';
import { Needs } from '@/features/admin/components/parts';
import { EventCaseScreen } from '@/features/admin/screens/EventCaseScreen';

export default function EventRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Needs need="businesses.view">
      <EventCaseScreen id={id} />
    </Needs>
  );
}
