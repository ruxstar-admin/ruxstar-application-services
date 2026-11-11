import { useLocalSearchParams } from 'expo-router';
import { Needs } from '@/features/admin/components/parts';
import { AccountScreen } from '@/features/admin/screens/AccountScreen';

export default function AccountRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Needs need="users.view">
      <AccountScreen id={id} />
    </Needs>
  );
}
