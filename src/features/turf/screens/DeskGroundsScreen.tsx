import { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { Feedback } from '@/lib/haptics';
import { TurfDeskService } from '@/services/turf-service';
import type { DeskGround } from '@/types/turf';
import { GROUND_STATUS } from '../lib/turf';

function GroundRow({ ground, onPress }: { ground: DeskGround; onPress: () => void }) {
  const status = GROUND_STATUS[ground.status];
  const line = `${ground.courts} ${ground.courts === 1 ? 'court' : 'courts'} taking bookings · ${ground.owner ? 'Yours' : ground.business.name}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${ground.name}, ${line}${ground.status === 'live' ? '' : `, ${status.label}`}`}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Ionicons name="grid-outline" size={22} color={Brand.primarySoft} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {ground.name}
        </Text>
        <Text style={styles.small} numberOfLines={1}>
          {line}
        </Text>
      </View>
      {ground.status === 'live' ? null : <Badge label={status.label} tone={status.tone} />}
      <Ionicons name="chevron-forward" size={18} color={Brand.textFaint} />
    </Pressable>
  );
}

/** The grounds you run, yours or your team's, each opening its day board. */
export function DeskGroundsScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { data, loading, error, reload } = useAsyncResource(() => TurfDeskService.grounds(token), 'desk');
  useRefetchOnFocus(useCallback(() => reload(), [reload]));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Ground desk" onBack={() => router.back()} />
      </View>
      {loading && !data ? (
        <View style={styles.skeletons}>
          {[0, 1].map((i) => (
            <Skeleton key={i} height={72} radius={18} />
          ))}
        </View>
      ) : error && !data ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load your grounds" actionLabel="Try again" onAction={reload} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(g) => g.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={Brand.primarySoft} />}
          ListEmptyComponent={
            <EmptyState
              icon="football-outline"
              title="No grounds to run"
              message="When a ground owner adds you to their team with ground permissions, their board shows up here."
            />
          }
          renderItem={({ item }) => <GroundRow ground={item} onPress={() => router.push({ pathname: '/(customer)/ground-desk/[id]', params: { id: item.id } })} />}
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
  pressed: { opacity: 0.8 },
  icon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(180,92,242,0.14)' },
  text: { flex: 1, gap: 2 },
  title: { ...Typography.bodyStrong, fontSize: 16, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
});
