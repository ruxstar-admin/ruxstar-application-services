import { Needs } from '@/features/admin/components/parts';
import { SupportSettingsScreen } from '@/features/admin/screens/SupportSettingsScreen';

export default function SupportSettingsRoute() {
  return (
    <Needs need="support.view">
      <SupportSettingsScreen />
    </Needs>
  );
}
