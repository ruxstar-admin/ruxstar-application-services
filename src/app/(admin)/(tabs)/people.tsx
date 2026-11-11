import { Needs } from '@/features/admin/components/parts';
import { PeopleScreen } from '@/features/admin/screens/PeopleScreen';

export default function PeopleTab() {
  return (
    <Needs need="users.view">
      <PeopleScreen />
    </Needs>
  );
}
