import { useLocalSearchParams } from 'expo-router';
import { PropertyFormScreen } from '@/features/stays/screens/PropertyFormScreen';

export default function EditPropertyRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PropertyFormScreen propertyId={id} />;
}
