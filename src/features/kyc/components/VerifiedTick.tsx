import { Ionicons } from '@expo/vector-icons';
import { Brand } from '@/constants/theme';

/** Beside a name: Ruxstar has checked this person's Aadhaar, PAN and face. */
export function VerifiedTick({ size = 16 }: { size?: number }) {
  return <Ionicons name="checkmark-circle" size={size} color={Brand.secondary} accessibilityLabel="Verified" accessibilityRole="image" />;
}
