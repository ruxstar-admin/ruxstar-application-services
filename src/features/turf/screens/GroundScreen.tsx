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
import { ReviewItem } from '@/features/reviews/components/ReviewItem';
import { Stars } from '@/features/reviews/components/Stars';
import { ratingLine } from '@/features/reviews/lib/review';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { TurfService } from '@/services/turf-service';
import type { GroundDetail } from '@/types/turf';
import { CourtCard } from '../components/CourtCard';
import { PhotoStrip } from '../components/PhotoStrip';
import { AMENITY, mapsUrl, refundTiers, sportsText } from '../lib/turf';

/** Reviews shown on the ground page. */
const FIRST_REVIEWS = 3;

function Reviews({ ground }: { ground: GroundDetail }) {
  const token = useAuthToken();
  const { data } = useAsyncResource(() => TurfService.reviews(token, ground.id), ground.id);
  if (!ground.rating) return null;
  return (
    <>
      <Section title="Reviews" />
      <View style={styles.rating}>
        {ground.rating.average !== null ? <Stars value={Math.round(ground.rating.average)} size={18} /> : null}
        <Text style={styles.text}>{ratingLine(ground.rating)}</Text>
      </View>
      {(data?.items ?? []).slice(0, FIRST_REVIEWS).map((r) => (
        <ReviewItem key={r.id} review={r} />
      ))}
    </>
  );
}

function GroundView({ ground }: { ground: GroundDetail }) {
  const router = useRouter();
  const book = (courtId?: string) => router.push({ pathname: '/(customer)/turf/book/[id]', params: { id: ground.id, ...(courtId ? { court: courtId } : {}) } });
  const live = ground.courtList.filter((c) => c.status === 'live');

  const footer = ground.canBook && live.length ? (
    <PrimaryButton label="Book a slot" onPress={() => book(live.length === 1 ? live[0]!.id : undefined)} />
  ) : (
    <PrimaryButton label={ground.whyNot ?? 'Not taking bookings right now'} disabled onPress={() => undefined} />
  );

  return (
    <ScreenContainer title="Ground" footer={footer}>
      <PhotoStrip photos={ground.photos} name={ground.name} dimmed={!ground.canBook} />
      <View style={styles.head}>
        <Text style={styles.title}>{ground.name}</Text>
        <Text style={styles.muted}>{`By ${ground.business.name}`}</Text>
        {ground.sports.length ? <Text style={styles.text}>{sportsText(ground.sports)}</Text> : null}
      </View>

      {ground.status === 'removed' ? <Notice tone="error" text="Ruxstar took this ground down. It isn’t taking bookings." /> : null}
      {ground.status !== 'removed' && !ground.canBook && ground.whyNot ? <Notice tone="warning" text={ground.whyNot} /> : null}

      <Facts>
        <Fact icon="location-outline" title={ground.venue.address} detail={[ground.venue.city, ground.venue.pincode].filter(Boolean).join(' ')} />
        <Fact icon="grid-outline" title={ground.courtList.length === 1 ? '1 court' : `${ground.courtList.length} courts`} detail={live.length < ground.courtList.length ? `${live.length} taking bookings now` : null} />
      </Facts>
      <TextLink label="Get directions" onPress={() => Linking.openURL(mapsUrl(ground.venue))} />

      {ground.amenities.length ? (
        <>
          <Section title="Amenities" />
          <View style={styles.amenities}>
            {ground.amenities.map((a) => (
              <View key={a} style={styles.amenity} accessible accessibilityLabel={AMENITY[a].label}>
                <Ionicons name={AMENITY[a].icon} size={16} color={Brand.primarySoft} />
                <Text style={styles.amenityText}>{AMENITY[a].label}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Section title="Courts and prices" />
      {ground.courtList.map((c) => (
        <CourtCard key={c.id} court={c}>
          {ground.canBook && c.status === 'live' ? <PrimaryButton label={`Book ${c.name}`} variant="outline" onPress={() => book(c.id)} /> : null}
        </CourtCard>
      ))}
      {ground.platformFee ? <Text style={styles.small}>{`Plus a ${money(ground.platformFee)} platform fee on each booking.`}</Text> : null}

      <RefundLine tiers={refundTiers(ground.refunds)} what="the slot starts" />
      <Text style={styles.small}>If the ground cancels, you get everything back.</Text>

      <Reviews ground={ground} />

      {ground.description ? (
        <>
          <Section title="About" />
          <Text style={styles.description}>{ground.description}</Text>
        </>
      ) : null}
    </ScreenContainer>
  );
}

/** One ground: photos, where it is, amenities, each court with its hours and prices, the refund rule and reviews. */
export function GroundScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => TurfService.get(token, id), id);
  useRefetchOnFocus(useCallback(() => reload(), [reload]));

  return data ? (
    <GroundView ground={data} />
  ) : (
    <ScreenContainer title="Ground">
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
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  amenity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    minHeight: 36,
    borderRadius: Radius.pill,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  amenityText: { ...Typography.caption, fontSize: 13, color: Brand.text },
  rating: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  description: { ...Typography.body, lineHeight: 24, color: Brand.textMuted },
});
