import { Needs } from '@/features/admin/components/parts';
import { ModulesScreen } from '@/features/admin/screens/ModulesScreen';

export default function ModulesRoute() {
  return (
    <Needs need="modules.view">
      <ModulesScreen />
    </Needs>
  );
}
