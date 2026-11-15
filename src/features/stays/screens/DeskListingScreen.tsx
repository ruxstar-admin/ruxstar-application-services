import { useLocalSearchParams } from 'expo-router';
import { NoDeskAccess, useDeskProperty } from '../components/DeskAccess';
import { PropertyFormScreen } from './PropertyFormScreen';

/** The listing edit for a warden allowed to change it. */
export function DeskListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const desk = useDeskProperty(id, 'stays.listing');
  if (!desk.property) return <NoDeskAccess title="Edit listing" {...desk} />;
  return <PropertyFormScreen propertyId={id} desk />;
}
