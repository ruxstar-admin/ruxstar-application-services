import { Needs } from '@/features/admin/components/parts';
import { PropertiesScreen } from '@/features/admin/screens/PropertiesScreen';

export default function PropertiesRoute() {
  return (
    <Needs need="businesses.view">
      <PropertiesScreen />
    </Needs>
  );
}
