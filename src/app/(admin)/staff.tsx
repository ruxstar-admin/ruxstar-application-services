import { Needs } from '@/features/admin/components/parts';
import { StaffScreen } from '@/features/admin/screens/StaffScreen';

export default function StaffRoute() {
  return (
    <Needs need="admin">
      <StaffScreen />
    </Needs>
  );
}
