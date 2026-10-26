import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { engagementRoute, MODULE_ICON } from '@/features/discover/lib/module-routes';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { formatRupees } from '@/lib/money';
import { timeAgo } from '@/lib/time';
import { CommerceService } from '@/services/commerce-service';
import type { Engagement } from '@/types/commerce';

const STATUS: Record<Engagement['status'], { label: string; tone: 'accent' | 'warning' | 'success' | 'error' }> = {
  confirmed: { label: 'Confirmed', tone: 'accent' },
  in_progress: { label: 'In progress', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'error' },
};

/** Every order, ticket, enrolment and stay in one list, newest first. */
export function MyOrdersScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { data, loading, error, reload } = useAsyncResource(() => CommerceService.engagements(token));
  useRefetchOnFocus(reload);

  return (
    <ScreenContainer title="Orders & bookings">
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload}>
        {data?.map((e) => (
          <View key={e.id}>
            <ListRow
              icon={MODULE_ICON[e.module]}
              title={e.title}
              subtitle={`${e.subtitle} · ${timeAgo(e.createdAt)}`}
              right={
                <View style={styles.right}>
                  <Text style={styles.amount}>{formatRupees(e.amount)}</Text>
                  <Badge label={STATUS[e.status].label} tone={STATUS[e.status].tone} />
                </View>
              }
              onPress={() => router.push(engagementRoute(e) as never)}
            />
          </View>
        ))}
        {data?.length === 0 ? (
          <EmptyState icon="receipt-outline" title="Nothing yet" message="Your print orders, tickets, classes and stays will be listed here." actionLabel="Discover" onAction={() => router.push('/(customer)/(tabs)/discover')} />
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  right: { alignItems: 'flex-end', gap: Spacing.one },
  amount: { ...Typography.bodyStrong, color: Brand.text },
});
