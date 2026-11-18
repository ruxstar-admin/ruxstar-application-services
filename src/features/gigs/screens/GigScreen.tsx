import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { Notice, Section } from '@/features/coaching/components/Parts';
import { ListingReviews } from '@/features/reviews/components/ListingReviews';
import { PhotoStrip } from '@/features/turf/components/PhotoStrip';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { GigsService } from '@/services/gigs-service';
import type { GigDetail, GigTier } from '@/types/gigs';
import { FreelancerRow } from '../components/FreelancerRow';
import { PackagePicker } from '../components/PackagePicker';
import { useFreelancerChat } from '../hooks/use-freelancer-chat';
import { pickPackage } from '../lib/gigs';

function GigView({ gig }: { gig: GigDetail }) {
  const router = useRouter();
  const message = useFreelancerChat(gig.freelancer);
  const [tier, setTier] = useState<GigTier>(() => pickPackage(gig.packages)?.tier ?? 'basic');
  const picked = pickPackage(gig.packages, tier);
  const openFreelancer = () => router.push({ pathname: '/(customer)/gigs/freelancer/[id]', params: { id: gig.freelancer.businessId } });

  const footer = (
    <>
      {gig.canOrder && picked ? (
        <PrimaryButton
          label={`Continue · ${money(picked.price)}`}
          onPress={() => router.push({ pathname: '/(customer)/gigs/checkout/[id]', params: { id: gig.id, tier: picked.tier } })}
        />
      ) : (
        <PrimaryButton label={gig.whyNot ?? 'Not taking orders'} disabled onPress={() => undefined} />
      )}
      {message ? <PrimaryButton label="Message the freelancer" variant="outline" onPress={message} /> : null}
    </>
  );

  return (
    <ScreenContainer title="Gig" footer={footer}>
      <PhotoStrip photos={gig.photos} name={gig.title} dimmed={!gig.canOrder} />
      <View style={styles.head}>
        <Badge label={gig.categoryLabel} tone="accent" />
        <Text style={styles.title}>{gig.title}</Text>
      </View>
      {gig.status === 'removed' ? <Notice tone="error" text="Ruxstar took this gig down. It isn’t taking orders." /> : null}
      {gig.status === 'paused' ? <Notice tone="warning" text="The freelancer has paused this gig for now." /> : null}

      <FreelancerRow freelancer={gig.freelancer} rating={gig.rating} onPress={openFreelancer} />

      <Section title="Packages" />
      <PackagePicker packages={gig.packages} tier={tier} onChange={setTier} />
      {gig.platformFee ? <Text style={styles.small}>{`Plus a ${money(gig.platformFee)} platform fee when you order.`}</Text> : null}
      {gig.rules ? <Text style={styles.small}>{gig.rules}</Text> : null}

      <Section title="About this gig" />
      <Text style={styles.description}>{gig.description}</Text>

      <ListingReviews module="gigs" listing={{ type: 'gig', id: gig.id }} business={gig.freelancer.name} rating={gig.rating} />
    </ScreenContainer>
  );
}

/** One gig: photos, the packages to compare, the freelancer, the rules, reviews, and ordering a package. */
export function GigScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => GigsService.get(token, id), id);
  useRefetchOnFocus(useCallback(() => reload(), [reload]));

  return data ? (
    <GigView gig={data} />
  ) : (
    <ScreenContainer title="Gig">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={4}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  head: { gap: Spacing.one, marginTop: Spacing.two, alignItems: 'flex-start' },
  title: { ...Typography.title, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
  description: { ...Typography.body, lineHeight: 24, color: Brand.textMuted },
});
