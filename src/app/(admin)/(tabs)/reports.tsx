import { Needs } from '@/features/admin/components/parts';
import { ReportsScreen } from '@/features/admin/screens/ReportsScreen';

export default function ReportsTab() {
  return (
    <Needs need="reports.view">
      <ReportsScreen />
    </Needs>
  );
}
