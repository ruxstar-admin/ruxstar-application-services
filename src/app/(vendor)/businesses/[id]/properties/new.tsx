import { useLocalSearchParams } from 'expo-router';
import { PropertyFormScreen } from '@/features/stays/screens/PropertyFormScreen';

/** The business id comes in as `id`; the form reads it as `businessId`. */
export default function NewPropertyRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PropertyFormScreen businessId={id} />;
}
