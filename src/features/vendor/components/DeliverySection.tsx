import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { RiderCard } from '@/features/pod/components/RiderCard';
import { tripActive, vehicleLine } from '@/features/pod/lib/order';
import { money } from '@/features/vendor/lib/pod';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey, type WriteOptions } from '@/lib/api-client';
import { formatDateTime } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import type { AssignChoice, DeliveryOptions, ShopOrder, TeamOrder } from '@/types/order';

/** The delivery calls of the owner's `ShopOrderService` or the team's `TeamOrderService`. */
export interface DeliveryDesk<T extends ShopOrder | TeamOrder> {
  deliveryOptions: (token: string, orderId: string) => Promise<DeliveryOptions>;
  assign: (token: string, orderId: string, choice: AssignChoice, options: WriteOptions) => Promise<T>;
  cancelDelivery: (token: string, orderId: string) => Promise<T>;
}

interface DeliverySectionProps<T extends ShopOrder | TeamOrder> {
  order: T;
  desk: DeliveryDesk<T>;
  /** "Accept and move orders": picking who delivers and cancelling it. */
  canManage: boolean;
  onChanged: (order: T) => void;
}

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

/** Who takes a ready order to the customer: the shop itself, someone on the team, or a Ruxstar partner. */
export function DeliverySection<T extends ShopOrder | TeamOrder>({ order, desk, canManage, onChanged }: DeliverySectionProps<T>) {
  const token = useAuthToken();
  const [picking, setPicking] = useState(false);
  const [options, setOptions] = useState<DeliveryOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());
  const { delivery } = order;
  const live = tripActive(delivery);

  const open = async () => {
    Feedback.tap();
    setPicking(true);
    setError(null);
    setLoading(true);
    try {
      setOptions(await desk.deliveryOptions(token, order.id));
    } catch (err) {
      setError(errorText(err, 'Could not load who can deliver. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  const assign = async (choice: AssignChoice) => {
    setSending(choice.carrier === 'team' ? choice.placeId : 'partner');
    setError(null);
    try {
      const next = await desk.assign(token, order.id, choice, { idempotencyKey: key.current });
      key.current = newIdempotencyKey();
      Feedback.success();
      setPicking(false);
      onChanged(next);
    } catch (err) {
      Feedback.error();
      setError(errorText(err, 'Could not send it. Try again.'));
    } finally {
      setSending(null);
    }
  };

  const cancel = async () => {
    setCancelling(true);
    setError(null);
    try {
      onChanged(await desk.cancelDelivery(token, order.id));
      Feedback.success();
    } catch (err) {
      Feedback.error();
      setError(errorText(err, 'Could not cancel the delivery. Try again.'));
    } finally {
      setCancelling(false);
    }
  };

  if (!live && order.status !== 'ready') return null;

  const note = !delivery
    ? undefined
    : delivery.status === 'offered' && delivery.carrier === 'partner'
      ? `Offered to Ruxstar partners nearby until ${delivery.offerUntil ? formatDateTime(delivery.offerUntil) : 'soon'}. The first to accept gets it.`
      : delivery.status === 'offered'
        ? 'Waiting for them to accept in the Ruxstar Delivery app.'
        : delivery.carrier === 'partner' && delivery.pay
          ? `${money(delivery.pay)} of the shop's share goes to the partner when it is delivered.`
          : undefined;

  return (
    <View style={styles.container}>
      <Text style={styles.section}>Delivery</Text>
      {live && delivery ? (
        <>
          <RiderCard delivery={delivery} note={note} />
          {canManage && delivery.status !== 'picked_up' ? (
            cancelling ? (
              <ActivityIndicator color={Brand.primarySoft} />
            ) : (
              <TextLink label="Cancel this delivery" onPress={cancel} />
            )
          ) : null}
        </>
      ) : (
        <View style={styles.card}>
          <Text style={styles.strong}>Who delivers?</Text>
          <Text style={styles.muted}>
            {delivery?.status === 'cancelled'
              ? 'The last delivery was handed back. Pick who takes it now.'
              : 'Deliver it yourself with the buttons above, or send someone on your team or a Ruxstar partner.'}
          </Text>
          {canManage ? <PrimaryButton label="Send with a rider" variant="outline" onPress={open} /> : null}
        </View>
      )}
      {error && !picking ? <ErrorBanner message={error} /> : null}

      <BottomSheet visible={picking} onClose={() => setPicking(false)} title="Who delivers?">
        {loading ? <ActivityIndicator color={Brand.primarySoft} /> : null}
        {options ? (
          <>
            {options.reason ? <Text style={styles.muted}>{options.reason}</Text> : null}
            <Text style={styles.overline}>Your team</Text>
            {options.team.length ? (
              options.team.map((person) => (
                <Choice
                  key={person.placeId}
                  icon={<Avatar uri={person.avatarUrl ?? undefined} name={person.name} size={40} />}
                  title={person.name}
                  line={person.vehicle ? vehicleLine(person.vehicle) : 'Needs delivery verification, from the delivery icon on their profile'}
                  disabled={!options.canAssign || !person.ready || !!sending}
                  busy={sending === person.placeId}
                  onPress={() => assign({ carrier: 'team', placeId: person.placeId })}
                />
              ))
            ) : (
              <Text style={styles.muted}>Nobody on your team delivers yet. Give someone Deliver orders in Team.</Text>
            )}
            <Text style={styles.overline}>Ruxstar partner</Text>
            <Choice
              icon={<Ionicons name="bicycle" size={28} color={Brand.primarySoft} />}
              title={`Ruxstar partner · ${money(options.partner.pay)}`}
              line={
                options.partner.reason ??
                `${options.partner.distanceKm ? `About ${options.partner.distanceKm} km. ` : ''}${options.partner.online} online nearby. Paid from your share at delivery.`
              }
              disabled={!options.canAssign || !options.partner.available || !!sending}
              busy={sending === 'partner'}
              onPress={() => assign({ carrier: 'partner' })}
            />
          </>
        ) : null}
        {error ? <ErrorBanner message={error} /> : null}
        <PrimaryButton label="Close" variant="outline" onPress={() => setPicking(false)} disabled={!!sending} />
      </BottomSheet>
    </View>
  );
}

function Choice({ icon, title, line, disabled, busy, onPress }: { icon: React.ReactNode; title: string; line: string; disabled: boolean; busy: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <View style={styles.icon}>{icon}</View>
      <View style={styles.flex}>
        <Text style={styles.strong}>{title}</Text>
        <Text style={styles.muted}>{line}</Text>
      </View>
      {busy ? <ActivityIndicator color={Brand.primarySoft} /> : <Ionicons name="chevron-forward" size={18} color={Brand.textFaint} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.four, marginBottom: Spacing.one },
  overline: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.two },
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  strong: { ...Typography.bodyStrong, color: Brand.text },
  muted: { ...Typography.caption, color: Brand.textMuted },
  choice: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surfaceAlt },
  icon: { width: 40, alignItems: 'center' },
  flex: { flex: 1 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
});
