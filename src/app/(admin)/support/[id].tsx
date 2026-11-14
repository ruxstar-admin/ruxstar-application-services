import { useLocalSearchParams } from 'expo-router';
import { Needs } from '@/features/admin/components/parts';
import { SupportTicketScreen } from '@/features/admin/screens/SupportTicketScreen';

export default function SupportTicketRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Needs need="support.view">
      <SupportTicketScreen id={id} />
    </Needs>
  );
}
