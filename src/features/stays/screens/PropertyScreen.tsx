import { useCallback } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RefundLine } from '@/components/booking';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Fact, Facts, Notice, Section } from '@/features/coaching/components/Parts';
import { ListingReviews } from '@/features/reviews/components/ListingReviews';
import { PhotoStrip } from '@/features/turf/components/PhotoStrip';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { StaysService } from '@/services/stays-service';
import type { PropertyDetail } from '@/types/stays';
import { RoomCard } from '../components/RoomCard';
import { KIND_LABEL, NEARBY, depositLine, foodText, forText, kmText, mapsUrl, noticeText, rulesList } from '../lib/stays';

function PropertyView({ property }: { property: PropertyDetail }) {
  const router = useRouter();
  const reserve = (roomId?: string) => router.push({ pathname: '/(customer)/stays/reserve/[id]', params: { id: property.id, ...(roomId ? { room: roomId } : {}) } });
  const live = property.rooms.filter((r) => r.status === 'live');
  const address = property.addressDetail;

  const footer =
    property.canReserve && live.length ? (
      <PrimaryButton label={live.length === 1 ? 'Reserve' : 'Pick a room'} onPress={() => reserve(live.length === 1 ? live[0]!.id : undefined)} />
    ) : (
      <PrimaryButton label={property.whyNot ?? 'Not taking reservations right now'} disabled onPress={() => undefined} />
    );

  return (
    <ScreenContainer title={KIND_LABEL[property.kind]} footer={footer}>
      <PhotoStrip photos={property.photos} name={property.name} dimmed={!property.canReserve} />
      <View style={styles.head}>
        <Text style={styles.title}>{property.name}</Text>
        <Text style={styles.muted}>{`By ${property.business.name}`}</Text>
        <Text style={styles.text}>{`${KIND_LABEL[property.kind]} · ${forText(property.for, property.occupants)}`}</Text>
      </View>

      {property.status === 'removed' ? <Notice tone="error" text="Ruxstar took this place down. It isn’t taking reservations." /> : null}
      {property.status !== 'removed' && !property.canReserve && property.whyNot ? <Notice tone="warning" text={property.whyNot} /> : null}

      <Facts>
        <Fact icon="location-outline" title={address.line} detail={[address.area, address.city, address.pincode].filter(Boolean).join(', ')} />
        <Fact icon="restaurant-outline" title={foodText(property.food)} />
        <Fact icon="wallet-outline" title={depositLine(property.depositDetail)} />
        <Fact icon="calendar-outline" title={noticeText(property.noticeDays)} />
        <Fact icon="shield-checkmark-outline" title="ID check before you reserve" detail="Owners see that you’re verified. It takes a few minutes, once." />
      </Facts>
      <TextLink label="Get directions" onPress={() => Linking.openURL(mapsUrl({ address: address.line, city: address.city, point: address.point }))} />

      {property.facilities.length ? (
        <>
          <Section title="Facilities" />
          <View style={styles.chips}>
            {property.facilities.map((f) => (
              <View key={f.key} style={styles.chip}>
                <Text style={styles.chipText}>{f.name}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Section title="House rules" />
      <View style={styles.rules}>
        {rulesList(property.rules).map((r) => (
          <View key={r.text} style={styles.rule} accessible accessibilityLabel={r.text}>
            <Ionicons name={r.ok ? 'checkmark-circle-outline' : 'close-circle-outline'} size={18} color={r.ok ? Brand.success : Brand.textMuted} />
            <Text style={styles.text}>{r.text}</Text>
          </View>
        ))}
        {property.rules.notes ? <Text style={styles.small}>{property.rules.notes}</Text> : null}
      </View>

      {property.nearby.length ? (
        <>
          <Section title="Nearby" />
          <View style={styles.rules}>
            {property.nearby.map((n) => (
              <View key={`${n.kind}|${n.name}`} style={styles.rule} accessible accessibilityLabel={`${NEARBY[n.kind].label}: ${n.name}, ${kmText(n.km)}`}>
                <Ionicons name={NEARBY[n.kind].icon} size={18} color={Brand.primarySoft} />
                <Text style={[styles.text, styles.flex]}>{n.name}</Text>
                <Text style={styles.small}>{kmText(n.km)}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Section title="Rooms and prices" />
      {property.rooms.map((r) => (
        <RoomCard key={r.id} room={r}>
          {property.canReserve && r.status === 'live' ? <PrimaryButton label={`Reserve in ${r.name}`} variant="outline" onPress={() => reserve(r.id)} /> : null}
        </RoomCard>
      ))}
      {property.platformFee ? <Text style={styles.small}>{`Plus a ${money(property.platformFee)} platform fee on each reservation.`}</Text> : null}
      <Text style={styles.small}>A PG reservation pays the first month; later months are paid to the owner. A hostel reservation pays the nights.</Text>

      <RefundLine text={property.refundRule} refundable />

      <ListingReviews module="stays" listing={{ type: 'property', id: property.id }} business={property.business.name} rating={property.rating} />

      {property.description ? (
        <>
          <Section title="About" />
          <Text style={styles.description}>{property.description}</Text>
        </>
      ) : null}
    </ScreenContainer>
  );
}

/** One PG or hostel: photos, where it is, food, deposit, notice, facilities, house rules, nearby places, rooms with their beds, refunds and reviews. */
export function PropertyScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => StaysService.get(token, id), id);
  useRefetchOnFocus(useCallback(() => reload(), [reload]));

  return data ? (
    <PropertyView property={data} />
  ) : (
    <ScreenContainer title="PG or hostel">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={4}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  head: { gap: Spacing.one, marginTop: Spacing.two },
  title: { ...Typography.title, color: Brand.text },
  muted: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  text: { ...Typography.body, fontSize: 15, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    minHeight: 36,
    borderRadius: Radius.pill,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  chipText: { ...Typography.caption, fontSize: 13, color: Brand.text },
  rules: { gap: Spacing.two },
  rule: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 28 },
  description: { ...Typography.body, lineHeight: 24, color: Brand.textMuted },
});
