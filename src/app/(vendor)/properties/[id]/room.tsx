import { useLocalSearchParams } from 'expo-router';
import { RoomFormScreen } from '@/features/stays/screens/RoomFormScreen';

export default function RoomRoute() {
  const { id, roomId } = useLocalSearchParams<{ id: string; roomId?: string }>();
  return <RoomFormScreen propertyId={id} roomId={roomId} />;
}
