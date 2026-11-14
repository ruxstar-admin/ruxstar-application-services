import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { BookingDemo } from '../components/BookingDemo';

/** Dev-only: the shared booking pieces with sample data, reachable from Settings while signed in. */
export function BookingPiecesScreen() {
  return (
    <ScreenContainer title="Booking pieces">
      <BookingDemo />
    </ScreenContainer>
  );
}
