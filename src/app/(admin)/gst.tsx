import { Needs } from '@/features/admin/components/parts';
import { GstSettingsScreen } from '@/features/admin/screens/GstSettingsScreen';

export default function GstSettingsRoute() {
  return (
    <Needs need="modules.view">
      <GstSettingsScreen />
    </Needs>
  );
}
