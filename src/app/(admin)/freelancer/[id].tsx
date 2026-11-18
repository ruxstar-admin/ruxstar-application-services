import { useLocalSearchParams } from 'expo-router';
import { Needs } from '@/features/admin/components/parts';
import { GigFreelancerCaseScreen } from '@/features/admin/screens/GigFreelancerCaseScreen';

export default function FreelancerRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Needs need="businesses.view">
      <GigFreelancerCaseScreen id={id} />
    </Needs>
  );
}
