import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { ApiError } from '@/lib/api-error';
import { timeAgo } from '@/lib/time';
import { TeamService } from '@/services/team-service';
import type { ActivityEntry } from '@/types/team';

function Who({ who }: { who: ActivityEntry['who'] }) {
  if (who.kind === 'you' || who.kind === 'team') return <Avatar name={who.name} uri={who.avatar ?? undefined} size={40} />;
  return (
    <View style={styles.badge}>
      <Ionicons name={who.kind === 'ruxstar' ? 'shield-checkmark-outline' : 'person-outline'} size={20} color={Brand.textMuted} />
    </View>
  );
}

/** What happened at a business and who did it, newest first. With `by`, one person's (from their team page). Only the owner sees it. */
export function ActivityScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { id, by, name } = useLocalSearchParams<{ id: string; by?: string; name?: string }>();
  const list = usePaginated((cursor) => TeamService.activity(token, id, by, cursor));
  useRefetchOnFocus(list.refresh);
  const refused = list.error instanceof ApiError && list.error.status > 0 && list.error.kind !== 'server' ? list.error.message : null;

  return (
    <ScreenContainer title={name ? `${name}’s activity` : 'Activity'}>
      {by ? null : <Text style={styles.muted}>Orders, shop and coupon changes, posts and the team, by you, your team, customers and Ruxstar.</Text>}
      {list.loading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={56} radius={14} />
          ))}
        </View>
      ) : list.error && !list.items.length ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load the activity" message={refused ?? 'Check your connection and try again.'} actionLabel="Try again" onAction={list.retry} />
      ) : !list.items.length ? (
        <EmptyState icon="time-outline" title="Nothing yet" message={by ? 'What they do at this business shows here.' : 'What happens at this business shows here.'} />
      ) : (
        <View>
          {list.items.map((entry) => (
            <ListRow
              key={entry.id}
              leading={<Who who={entry.who} />}
              title={entry.line}
              subtitle={`${entry.who.name} · ${timeAgo(entry.at)}`}
              onPress={entry.orderId ? () => router.push({ pathname: '/(vendor)/sale/[id]', params: { id: entry.orderId! } }) : undefined}
            />
          ))}
          {list.hasMore ? <PrimaryButton label="Show more" variant="outline" onPress={list.loadMore} loading={list.loadingMore} /> : null}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  muted: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  skeletons: { gap: Spacing.three },
  badge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.surfaceAlt },
});
