import { Needs } from '@/features/admin/components/parts';
import { StoresScreen } from '@/features/admin/screens/StoresScreen';

export default function StoresRoute() {
  return (
    <Needs need="businesses.view">
      <StoresScreen />
    </Needs>
  );
}
