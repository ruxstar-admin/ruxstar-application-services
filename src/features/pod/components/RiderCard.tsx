import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { DELIVERY_STATUS_LABEL, tripActive, vehicleLine } from '@/features/pod/lib/order';
import { Feedback } from '@/lib/haptics';
import type { OrderDelivery } from '@/types/order';

interface RiderCardProps {
  delivery: OrderDelivery;
  /** The customer's code for the door, while the trip is on. */
  code?: string | null;
  /** A line under the status, such as the partner's pay for the shop. */
  note?: string;
}

/** Who is bringing the order: the rider's name, photo and vehicle, a Call button, and for the customer the code to give at the door. */
export function RiderCard({ delivery, code, note }: RiderCardProps) {
  const { rider } = delivery;
  const live = tripActive(delivery);
  const call = () => {
    if (!rider) return;
    Feedback.tap();
    void Linking.openURL(`tel:${rider.phone}`);
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Ionicons name="bicycle" size={20} color={live ? Brand.primarySoft : Brand.textMuted} />
        <Text style={styles.status}>{DELIVERY_STATUS_LABEL[delivery.status]}</Text>
        <Text style={styles.faint}>{delivery.carrier === 'partner' ? 'Ruxstar partner' : 'Shop team'}</Text>
      </View>
      {note ? <Text style={styles.muted}>{note}</Text> : null}
      {rider ? (
        <View style={styles.rider}>
          <Avatar uri={rider.avatarUrl ?? undefined} name={rider.name} size={44} />
          <View style={styles.flex}>
            <Text style={styles.name}>{rider.name}</Text>
            <Text style={styles.muted}>{vehicleLine(rider.vehicle)}</Text>
          </View>
          {live ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`Call ${rider.name}`} onPress={call} style={({ pressed }) => [styles.call, pressed && styles.pressed]}>
              <Ionicons name="call" size={20} color={Brand.onAction} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {code && live ? (
        <View style={styles.code}>
          <Text style={styles.muted}>Give this code to the rider at the door</Text>
          <Text style={styles.digits} accessibilityLabel={`Delivery code ${code.split('').join(' ')}`}>
            {code}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  status: { ...Typography.bodyStrong, color: Brand.text, flex: 1 },
  rider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1 },
  name: { ...Typography.bodyStrong, color: Brand.text },
  muted: { ...Typography.caption, fontSize: 13, color: Brand.textMuted },
  faint: { ...Typography.caption, fontSize: 12, color: Brand.textFaint },
  call: { width: 44, height: 44, borderRadius: 22, backgroundColor: Brand.action, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  code: { gap: Spacing.one, alignItems: 'center', paddingVertical: Spacing.two, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  digits: { ...Typography.title, fontSize: 32, letterSpacing: 8, color: Brand.text },
});
