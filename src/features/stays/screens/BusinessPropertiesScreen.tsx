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
import { VendorStaysService } from '@/services/stays-service';
import type { VendorProperty } from '@/types/stays';
import { KIND_LABEL, PROPERTY_STATUS, plural } from '../lib/stays';

function propertyLine(p: VendorProperty): string {
  if (p.status === 'draft') return p.missing.length ? `To do: ${p.missing[0]}` : 'Ready to publish';
  if (p.status === 'removed') return 'Taken down by Ruxstar';
  const beds = p.rooms.reduce((n, r) => n + r.beds, 0);
  return `${plural(p.rooms.length, 'room')} · ${plural(beds, 'bed')} · ${p.staying} staying · ${p.upcoming} to move in`;
}

function PropertyRow({ property, onPress }: { property: VendorProperty; onPress: () => void }) {
  const status = PROPERTY_STATUS[property.status];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${property.name}, ${status.label}, ${propertyLine(property)}`}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {property.name}
        </Text>
        <Text style={styles.small} numberOfLines={1}>
          {[KIND_LABEL[property.kind], property.area, property.city].filter(Boolean).join(' · ')}
        </Text>
        <Text style={styles.small}>{propertyLine(property)}</Text>
      </View>
      <Badge label={status.label} tone={status.tone} />
      <Ionicons name="chevron-forward" size={18} color={Brand.textFaint} />
    </Pressable>
  );
}

/** A business's PGs and hostels and the way to add one. */
export function BusinessPropertiesScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const list = usePaginated(() => VendorStaysService.list(token, id));
  useRefetchOnFocus(list.refresh);
  const create = () => router.push({ pathname: '/(vendor)/businesses/[id]/properties/new', params: { id } });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Properties & rooms" onBack={() => router.back()} />
      </View>
      {list.loading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={84} radius={18} />
          ))}
        </View>
      ) : list.error && !list.items.length ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load your properties" actionLabel="Try again" onAction={list.retry} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
          ListEmptyComponent={
            <EmptyState
              icon="bed-outline"
              title="No PGs or hostels yet"
              message="Add your place, then its rooms with their beds and prices. It’s a draft until you publish it."
              actionLabel="Add a PG or hostel"
              onAction={create}
            />
          }
          renderItem={({ item }) => <PropertyRow property={item} onPress={() => router.push({ pathname: '/(vendor)/properties/[id]', params: { id: item.id } })} />}
        />
      )}
      {list.items.length ? (
        <View style={styles.footer}>
          <PrimaryButton label="Add a PG or hostel" onPress={create} />
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
