import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { Feedback } from '@/lib/haptics';
import { DeskService } from '@/services/events-service';
import type { DeskEvent } from '@/types/events';
import { dayText, timeText } from '../lib/events';

function DeskRow({ event, onPress }: { event: DeskEvent; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${event.today ? 'today' : dayText(event.startsAt)}, ${event.counts.inToday} of ${event.counts.tickets} in`}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, event.today && styles.today, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Ionicons name="qr-code-outline" size={24} color={Brand.primarySoft} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.small} numberOfLines={1}>
          {`${event.business.name} · ${dayText(event.startsAt)}, ${timeText(event.startsAt)}`}
        </Text>
        <Text style={styles.small}>{event.today ? `${event.counts.inToday} of ${event.counts.tickets} in today` : `${event.counts.tickets} tickets`}</Text>
      </View>
      {event.today ? <Badge label="Today" tone="success" /> : null}
      <Ionicons name="chevron-forward" size={18} color={Brand.textFaint} />
    </Pressable>
  );
}

/** Events you can check people in at: your own, and ones where the owner made you a gate keeper. */
export function GateListScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated(() => DeskService.list(token));
  useRefetchOnFocus(list.refresh);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Scan tickets" onBack={() => router.back()} />
      </View>
      {list.loading ? (
        <View style={styles.skeletons}>
          {[0, 1].map((i) => (
            <Skeleton key={i} height={84} radius={18} />
          ))}
        </View>
      ) : list.error && !list.items.length ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load events" message="Check your connection and try again." actionLabel="Try again" onAction={list.retry} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
          ListEmptyComponent={
            <EmptyState
              icon="qr-code-outline"
              title="No events to scan"
              message="Events on sale show up here: your own, and ones where you’re a gate keeper. Online events have no tickets to scan."
            />
          }
          renderItem={({ item }) => <DeskRow event={item} onPress={() => router.push({ pathname: '/(customer)/gate/[id]', params: { id: item.id } })} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.two, flexGrow: 1 },
  skeletons: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  today: { borderColor: 'rgba(52,199,89,0.45)' },
  pressed: { opacity: 0.8 },
  icon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(180,92,242,0.14)' },
  text: { flex: 1, gap: 2 },
  title: { ...Typography.bodyStrong, fontSize: 16, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
});
