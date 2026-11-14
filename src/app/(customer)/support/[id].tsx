import { useLocalSearchParams } from 'expo-router';
import { TicketScreen } from '@/features/support/screens/TicketScreen';

export default function TicketRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TicketScreen id={id} />;
}
