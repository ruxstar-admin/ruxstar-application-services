import { EmptyState } from '@/components/ui/EmptyState';
import { VendorTabScreen } from '@/features/vendor/components/VendorTabScreen';

/** Orders and bookings arrive with each module's ordering phase; until then there is nothing to list. */
export function VendorOrdersScreen() {
  return (
    <VendorTabScreen title="Orders">
      <EmptyState
        icon="receipt-outline"
        title="No orders yet"
        message="Orders and bookings from customers show here once ordering opens for your businesses."
      />
    </VendorTabScreen>
  );
}
