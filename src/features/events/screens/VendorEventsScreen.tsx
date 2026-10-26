import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Typography } from '@/constants/theme';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { formatDateTime } from '@/lib/dates';
import { EventsService } from '@/services/events-service';

export function VendorEventsScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { data, loading, error, reload } = useAsyncResource(() => EventsService.vendorEvents(token));
  useRefetchOnFocus(reload);

  return (
    <ScreenContainer title="Events" footer={<PrimaryButton label="Create event" onPress={() => router.push('/(vendor)/events/create')} />}>
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload}>
        {data?.map((event) => (
          <View key={event.id}>
            <ListRow
              icon="calendar-outline"
              title={event.title}
              subtitle={formatDateTime(event.startsAt)}
              right={<Badge label={`${event.registered}/${event.capacity}`} tone={event.registered >= event.capacity ? 'error' : 'success'} />}
              onPress={() => router.push({ pathname: '/(vendor)/events/[id]', params: { id: event.id, title: event.title } })}
            />
          </View>
        ))}
        {data?.length === 0 ? <EmptyState icon="calendar-outline" title="No events yet" message="Create your first event to start taking registrations." /> : null}
        {data && data.length > 0 ? <Text style={styles.note}>Tap an event to see registrations and check people in.</Text> : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  note: { ...Typography.caption, color: Brand.textFaint, marginTop: 8 },
});
