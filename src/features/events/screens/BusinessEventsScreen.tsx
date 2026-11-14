import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { Feedback } from '@/lib/haptics';
import { VendorEventsService } from '@/services/events-service';
import type { VendorEvent } from '@/types/events';
import { EVENT_STATUS, dayText, soldLine, timeText } from '../lib/events';

function EventRow({ event, onPress }: { event: VendorEvent; onPress: () => void }) {
  const status = EVENT_STATUS[event.status];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${status.label}, ${dayText(event.startsAt)}`}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.small}>{`${dayText(event.startsAt)} · ${timeText(event.startsAt)}`}</Text>
        <Text style={styles.small}>{event.status === 'draft' ? (event.missing.length ? `To do: ${event.missing[0]}` : 'Ready to publish') : soldLine(event)}</Text>
      </View>
      <Badge label={status.label} tone={status.tone} />
      <Ionicons name="chevron-forward" size={18} color={Brand.textFaint} />
    </Pressable>
  );
}

/** A business's events, newest first, and the way to make a new one. */
export function BusinessEventsScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const list = usePaginated(() => VendorEventsService.list(token, id));
  useRefetchOnFocus(list.refresh);
  const create = () => router.push({ pathname: '/(vendor)/businesses/[id]/events/new', params: { id } });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Events" onBack={() => router.back()} />
      </View>
      {list.loading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={84} radius={18} />
          ))}
        </View>
      ) : list.error && !list.items.length ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load your events" actionLabel="Try again" onAction={list.retry} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
          ListEmptyComponent={
            <EmptyState icon="calendar-outline" title="No events yet" message="Make your first one. It’s saved as a draft until you publish it." actionLabel="New event" onAction={create} />
          }
          renderItem={({ item }) => <EventRow event={item} onPress={() => router.push({ pathname: '/(vendor)/events/[id]', params: { id: item.id } })} />}
        />
      )}
      {list.items.length ? (
        <View style={styles.footer}>
          <PrimaryButton label="New event" onPress={create} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.two, flexGrow: 1 },
  skeletons: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  footer: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  pressed: { opacity: 0.8 },
  text: { flex: 1, gap: 2 },
  title: { ...Typography.bodyStrong, fontSize: 16, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
});
