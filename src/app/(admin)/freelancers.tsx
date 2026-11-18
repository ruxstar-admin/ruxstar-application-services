import { Needs } from '@/features/admin/components/parts';
import { GigFreelancersScreen } from '@/features/admin/screens/GigFreelancersScreen';

export default function FreelancersRoute() {
  return (
    <Needs need="businesses.view">
      <GigFreelancersScreen />
    </Needs>
  );
}
