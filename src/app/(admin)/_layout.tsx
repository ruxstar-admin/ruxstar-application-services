import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '@/constants/motion';
import { AccessProvider } from '@/features/admin/access';
import { ConsoleGate } from '@/features/admin/components/ConsoleGate';

/**
 * The Ruxstar console (decision 42). Admins and Ruxstar staff land here and see only this area;
 * each section shows only when their access includes it, and the API checks every call again.
 */
export default function AdminLayout() {
  return (
    <AccessProvider>
      <ConsoleGate>
        <Stack screenOptions={STACK_SCREEN_OPTIONS} />
      </ConsoleGate>
    </AccessProvider>
  );
}
