import { useLocalSearchParams } from 'expo-router';
import { Needs } from '@/features/admin/components/parts';
import { GigListingCaseScreen } from '@/features/admin/screens/GigListingCaseScreen';

export default function GigListingRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Needs need="businesses.view">
      <GigListingCaseScreen id={id} />
    </Needs>
  );
}
