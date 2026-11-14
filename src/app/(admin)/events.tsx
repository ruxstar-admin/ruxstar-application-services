import { Needs } from '@/features/admin/components/parts';
import { EventsScreen } from '@/features/admin/screens/EventsScreen';

export default function EventsRoute() {
  return (
    <Needs need="businesses.view">
      <EventsScreen />
    </Needs>
  );
}
