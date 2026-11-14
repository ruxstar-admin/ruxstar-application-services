import { Needs } from '@/features/admin/components/parts';
import { SupportQueueScreen } from '@/features/admin/screens/SupportQueueScreen';

export default function SupportQueueRoute() {
  return (
    <Needs need="support.view">
      <SupportQueueScreen />
    </Needs>
  );
}
