import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { AdminService } from '@/services/admin-service';
import type { AccountRow, AccountStatus } from '@/types/admin';
import { Card, Row, consoleStyles, errorText } from './parts';

export const roleText = (a: Pick<AccountRow, 'roles'>) =>
  [a.roles.admin && 'Admin', a.roles.ruxstarStaff && 'Staff', a.roles.vendor && 'Vendor', a.roles.delivery && 'Delivery'].filter(Boolean).join(', ') || 'Member';

export function AccountBadge({ status }: { status: AccountStatus }) {
  if (status === 'active') return null;
  return <Badge label={status === 'locked' ? 'On hold' : 'Deleted'} tone="error" />;
}

/** Accounts matching a search. Remount (by `key`) when the query or filter changes. */
export function AccountResults({ q, status, onPick }: { q: string; status?: AccountStatus; onPick: (a: AccountRow) => void }) {
  const token = useAuthToken();
  const list = usePaginated((cursor) => AdminService.findAccounts(token, q, status, cursor));

  if (list.loading) {
    return (
      <View style={consoleStyles.skeletons}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={68} radius={14} />
        ))}
      </View>
    );
  }
  if (list.error && list.items.length === 0) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load people" message={errorText(list.error)} actionLabel="Try again" onAction={list.retry} />;
  }

  return (
    <FlatList
      data={list.items}
      keyExtractor={(a) => a.id}
      contentContainerStyle={consoleStyles.list}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={<EmptyState icon="people-outline" title="No one found" message={q.trim() ? 'Try a different name, @username or phone number.' : undefined} />}
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={consoleStyles.footer} /> : null}
      renderItem={({ item: a }) => (
        <Card>
          <Row
            name={a.name}
            avatarUrl={a.avatarUrl}
            title={a.name || 'No name'}
            subtitle={`@${a.username} · ${a.phone} · ${roleText(a)}`}
            right={<AccountBadge status={a.status} />}
            onPress={() => onPick(a)}
          />
        </Card>
      )}
    />
  );
}
