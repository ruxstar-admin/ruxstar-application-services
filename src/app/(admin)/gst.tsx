import { useLocalSearchParams } from 'expo-router';
import { Needs } from '@/features/admin/components/parts';
import { GstSettingsScreen } from '@/features/admin/screens/GstSettingsScreen';

export default function GstSettingsRoute() {
  const { module } = useLocalSearchParams<{ module?: string }>();
  return (
    <Needs need="modules.view">
      <GstSettingsScreen module={module} />
    </Needs>
  );
}
