import { Redirect } from 'expo-router';
import { BookingPiecesScreen } from '@/features/design/screens/BookingPiecesScreen';

/** Dev-only preview of the shared booking pieces. Hidden in release builds. */
export default function BookingPieces() {
  return __DEV__ ? <BookingPiecesScreen /> : <Redirect href="/(customer)/settings" />;
}
