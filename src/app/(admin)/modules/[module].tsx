import { useLocalSearchParams } from 'expo-router';
import { Needs } from '@/features/admin/components/parts';
import { ModuleScreen } from '@/features/admin/screens/ModuleScreen';

export default function ModuleRoute() {
  const { module } = useLocalSearchParams<{ module: string }>();
  return (
    <Needs need="modules.view">
      <ModuleScreen module={module} />
    </Needs>
  );
}
