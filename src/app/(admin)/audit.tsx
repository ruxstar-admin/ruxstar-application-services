import { useLocalSearchParams } from 'expo-router';
import { Needs } from '@/features/admin/components/parts';
import { AuditScreen } from '@/features/admin/screens/AuditScreen';

export default function AuditRoute() {
  const { target, actor } = useLocalSearchParams<{ target?: string; actor?: string }>();
  return (
    <Needs need="audit.view">
      <AuditScreen target={target} actor={actor} />
    </Needs>
  );
}
