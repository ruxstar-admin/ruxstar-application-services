import { useLocalSearchParams } from 'expo-router';
import { DashboardSectionScreen } from '@/features/admin/screens/DashboardSectionScreen';

export default function DashboardSectionRoute() {
  const { section } = useLocalSearchParams<{ section: string }>();
  return <DashboardSectionScreen section={section} />;
}
