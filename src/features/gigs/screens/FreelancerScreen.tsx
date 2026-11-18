import { useCallback } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Avatar } from '@/components/ui/Avatar';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { Fact, Facts, Section } from '@/features/coaching/components/Parts';
import { ratingLine } from '@/features/reviews/lib/review';
import { PhotoStrip } from '@/features/turf/components/PhotoStrip';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { GigsService } from '@/services/gigs-service';
import { useAuthStore } from '@/stores/auth-store';
import type { FreelancerPage } from '@/types/gigs';
import { GigCardView } from '../components/GigCardView';

const monthYear = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

function PageView({ page }: { page: FreelancerPage }) {
  const router = useRouter();
  const me = useAuthStore((s) => s.userId);
  const where = [page.categoryLabel, page.city].filter(Boolean).join(' · ');
  const footer =
    page.userId === me ? null : (
      <PrimaryButton
        label={`Message ${page.name}`}
        variant="outline"
        onPress={() =>
          router.push({ pathname: '/(customer)/chat/with/[userId]', params: { userId: page.userId, title: page.name, username: page.username ?? '', avatar: page.avatarUrl ?? '' } })
        }
      />
    );

  return (
    <ScreenContainer title="Freelancer" footer={footer}>
      <View style={styles.head}>
        <Avatar name={page.name} uri={page.avatarUrl ?? undefined} size={72} />
        <View style={styles.headText}>
          <Text style={styles.title}>{page.name}</Text>
          <Text style={styles.text}>{page.headline}</Text>
          <Text style={styles.small}>{where}</Text>
        </View>
      </View>

      <Facts>
        {page.rating ? <Fact icon="star-outline" title={ratingLine(page.rating)} /> : null}
        {page.languages.length ? <Fact icon="chatbubbles-outline" title="Speaks" detail={page.languages.join(', ')} /> : null}
        <Fact icon="calendar-outline" title={`On Ruxstar since ${monthYear(page.memberSince)}`} />
      </Facts>

      {page.bio ? (
        <>
          <Section title="About" />
          <Text style={styles.description}>{page.bio}</Text>
        </>
      ) : null}
      {page.skills.length ? (
        <>
          <Section title="Skills" />
          <Text style={styles.text}>{page.skills.join(' · ')}</Text>
        </>
      ) : null}

      {page.portfolio.photos.length || page.portfolio.links.length ? <Section title="Portfolio" /> : null}
      {page.portfolio.photos.length ? <PhotoStrip photos={page.portfolio.photos} name={page.name} /> : null}
      {page.portfolio.links.map((l) => (
        <TextLink key={l.id} label={`${l.title} ›`} onPress={() => void Linking.openURL(l.url)} />
      ))}

      <Section title="Gigs" />
      {page.gigs.length ? (
        page.gigs.map((g) => <GigCardView key={g.id} gig={g} hideFreelancer onPress={() => router.push({ pathname: '/(customer)/gigs/[id]', params: { id: g.id } })} />)
      ) : (
        <Text style={styles.small}>No gigs live right now. Message them to ask for a custom offer.</Text>
      )}
    </ScreenContainer>
  );
}

/** A freelancer's page: who they are, their skills and portfolio, and their live gigs. */
export function FreelancerScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => GigsService.freelancer(token, id), id);
  useRefetchOnFocus(useCallback(() => reload(), [reload]));

  return data ? (
    <PageView page={data} />
  ) : (
    <ScreenContainer title="Freelancer">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={4}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginTop: Spacing.two },
  headText: { flex: 1, gap: 2 },
  title: { ...Typography.title, color: Brand.text },
  text: { ...Typography.body, fontSize: 15, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
  description: { ...Typography.body, lineHeight: 24, color: Brand.textMuted },
});
