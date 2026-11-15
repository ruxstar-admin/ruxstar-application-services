import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { InputField } from '@/components/ui/InputField';
import { MultiChoiceChips } from '@/components/ui/MultiChoiceChips';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { Feedback } from '@/lib/haptics';
import { StaysService } from '@/services/stays-service';
import type { Facility, PropertiesQuery, PropertyKind } from '@/types/stays';
import { ALLOWS, BUDGETS, NOTICES, NO_FILTERS, filterCount, toQuery, withStay, type StayFilters } from '../lib/filters';
import { KINDS, KIND_LABEL, MEALS, MEAL_LABEL } from '../lib/stays';
import { PropertyCardView } from './PropertyCardView';

/** Waits this long after the last keystroke before filtering by city. */
const CITY_DELAY_MS = 350;

const KIND_CHIPS = [{ key: 'all', label: 'All' }, ...KINDS.map((k) => ({ key: k, label: KIND_LABEL[k] }))] as const;

function Cards({ query, filtered }: { query: PropertiesQuery; filtered: boolean }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => StaysService.list(token, query, cursor));

  if (list.loading) {
    return (
      <View style={styles.skeletons}>
        {[0, 1].map((i) => (
          <View key={i} style={styles.skeletonCard}>
            <Skeleton height={190} radius={18} />
            <Skeleton height={16} width="65%" />
            <Skeleton height={12} width="40%" />
          </View>
        ))}
      </View>
    );
  }
  if (list.error && !list.items.length) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load places" message="Check your connection and try again." actionLabel="Try again" onAction={list.retry} />;
  }
  return (
    <FlatList
      data={list.items}
      keyExtractor={(p) => p.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      initialNumToRender={4}
      windowSize={7}
      ListEmptyComponent={
        <EmptyState
          icon="bed-outline"
          title={filtered ? 'No places match' : 'No PGs or hostels yet'}
          message={filtered ? 'Try another city, or fewer filters.' : 'PGs, hostels and co-living places show up here as soon as they open for reservations.'}
        />
      }
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
      renderItem={({ item }) => <PropertyCardView property={item} onPress={() => router.push({ pathname: '/(customer)/stays/[id]', params: { id: item.id } })} />}
    />
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

interface Applied {
  filters: StayFilters;
  area: string;
  near: string;
}

function FiltersSheet({
  visible,
  applied,
  facilities,
  onApply,
  onClose,
}: {
  visible: boolean;
  applied: Applied;
  facilities: readonly Facility[];
  onApply: (next: Applied) => void;
  onClose: () => void;
}) {
  const { height } = useWindowDimensions();
  const [draft, setDraft] = useState(applied);
  const [shown, setShown] = useState(visible);
  if (visible !== shown) {
    setShown(visible);
    if (visible) setDraft(applied);
  }
  const f = draft.filters;
  const set = (patch: Partial<StayFilters>) => setDraft((d) => ({ ...d, filters: { ...d.filters, ...patch } }));
  const unit = f.stay ?? 'month';
  const budgets = [{ key: 'any', label: 'Any budget' }, ...BUDGETS[unit].map((b) => ({ key: String(b), label: `Up to ${money(b * 100)}${unit === 'night' ? ' a night' : ''}` }))];

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Filters">
      <ScrollView style={{ maxHeight: height * 0.62 }} contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
        <Group title="Who it’s for">
          <ChoiceChips
            secondary
            options={[
              { key: 'any', label: 'Anyone' },
              { key: 'men', label: 'Men' },
              { key: 'women', label: 'Women' },
            ]}
            value={f.for ?? 'any'}
            onChange={(k) => set({ for: k === 'any' ? null : k })}
          />
          <ChoiceChips
            secondary
            options={[
              { key: 'any', label: 'Students or working' },
              { key: 'students', label: 'Students' },
              { key: 'working', label: 'Working people' },
            ]}
            value={f.occupant ?? 'any'}
            onChange={(k) => set({ occupant: k === 'any' ? null : k })}
          />
        </Group>
        <Group title="Stay and budget">
          <ChoiceChips
            secondary
            options={[
              { key: 'any', label: 'By month or night' },
              { key: 'month', label: 'By the month' },
              { key: 'night', label: 'By the night' },
            ]}
            value={f.stay ?? 'any'}
            onChange={(k) => setDraft((d) => ({ ...d, filters: withStay(d.filters, k === 'any' ? null : k) }))}
          />
          <ChoiceChips secondary options={budgets} value={f.budget === null ? 'any' : String(f.budget)} onChange={(k) => set({ budget: k === 'any' ? null : Number(k) })} />
        </Group>
        <Group title="Room">
          <ChoiceChips
            secondary
            options={[
              { key: 'any', label: 'Private or shared' },
              { key: 'private', label: 'Private room' },
              { key: 'shared', label: 'Shared room' },
            ]}
            value={f.room ?? 'any'}
            onChange={(k) => set({ room: k === 'any' ? null : k })}
          />
        </Group>
        <Group title="Food">
          <ChoiceChips
            secondary
            options={[
              { key: 'any', label: 'With or without' },
              { key: 'served', label: 'Food included' },
              { key: 'veg', label: 'Veg only' },
            ]}
            value={f.food === 'any' ? 'served' : (f.food ?? 'any')}
            onChange={(k) => set({ food: k === 'served' ? 'any' : k === 'veg' ? 'veg' : null, ...(k === 'any' ? { meals: [] } : {}) })}
          />
          {f.food ? <MultiChoiceChips options={MEALS.map((m) => ({ key: m, label: MEAL_LABEL[m] }))} value={f.meals} onChange={(meals) => set({ meals })} /> : null}
        </Group>
        {facilities.length ? (
          <Group title="Facilities">
            <MultiChoiceChips options={facilities.map((x) => ({ key: x.key, label: x.name }))} value={f.facilities} onChange={(list) => set({ facilities: list })} />
          </Group>
        ) : null}
        <Group title="House rules">
          <MultiChoiceChips options={ALLOWS} value={f.allows} onChange={(allows) => set({ allows })} />
        </Group>
        <Group title="Notice to move out">
          <ChoiceChips
            secondary
            options={[{ key: 'any', label: 'Any notice' }, ...NOTICES.map((n) => ({ key: String(n), label: n === 0 ? 'No notice' : `Up to ${n} days` }))]}
            value={f.noticeMax === null ? 'any' : String(f.noticeMax)}
            onChange={(k) => set({ noticeMax: k === 'any' ? null : Number(k) })}
          />
        </Group>
        <Group title="Where">
          <InputField label="Area" value={draft.area} onChangeText={(area) => setDraft((d) => ({ ...d, area }))} placeholder="Like Koramangala" maxLength={60} autoCorrect={false} />
          <InputField
            label="Near a college, office or metro"
            value={draft.near}
            onChangeText={(near) => setDraft((d) => ({ ...d, near }))}
            placeholder="Like Christ University"
            maxLength={60}
            autoCorrect={false}
          />
        </Group>
      </ScrollView>
      <PrimaryButton label="Show places" onPress={() => onApply(draft)} />
      <PrimaryButton label="Clear all" variant="outline" onPress={() => onApply({ filters: NO_FILTERS, area: '', near: '' })} />
    </BottomSheet>
  );
}

/** PGs, hostels and co-living for Discover: by kind and city up top, everything else in Filters. The search box matches names. */
export function PropertyResults({ q }: { q: string }) {
  const token = useAuthToken();
  const facilities = useAsyncResource(() => StaysService.facilities(token), 'stays-facilities');
  const [kind, setKind] = useState<PropertyKind | 'all'>('all');
  const [cityText, setCityText] = useState('');
  const [city, setCity] = useState('');
  const [applied, setApplied] = useState<Applied>({ filters: NO_FILTERS, area: '', near: '' });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setCity(cityText.trim()), CITY_DELAY_MS);
    return () => clearTimeout(t);
  }, [cityText]);

  const filters = { ...applied.filters, kind: kind === 'all' ? null : kind };
  const query = toQuery(filters, { q, city, area: applied.area, near: applied.near });
  const count = filterCount(applied.filters) + (applied.area.trim() ? 1 : 0) + (applied.near.trim() ? 1 : 0);
  const key = JSON.stringify(query);

  return (
    <>
      <ChoiceChips options={KIND_CHIPS} value={kind} onChange={setKind} secondary />
      <View style={styles.bar}>
        <View style={styles.city}>
          <InputField value={cityText} onChangeText={setCityText} placeholder="Any city" autoCorrect={false} accessibilityLabel="City" />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={count ? `Filters, ${count} set` : 'Filters'}
          onPress={() => {
            Feedback.tap();
            setOpen(true);
          }}
          style={({ pressed }) => [styles.filters, count > 0 && styles.filtersOn, pressed && styles.pressed]}
        >
          <Ionicons name="options-outline" size={18} color={count ? Brand.primarySoft : Brand.text} />
          <Text style={[styles.filtersText, count > 0 && styles.filtersTextOn]}>{count ? `Filters · ${count}` : 'Filters'}</Text>
        </Pressable>
      </View>
      <Cards key={key} query={query} filtered={Object.keys(query).length > 0} />
      <FiltersSheet
        visible={open}
        applied={applied}
        facilities={facilities.data ?? []}
        onApply={(next) => {
          setApplied(next);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three },
  city: { flex: 1 },
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  filtersOn: { borderColor: Brand.primary },
  filtersText: { ...Typography.bodyStrong, fontSize: 14, color: Brand.text },
  filtersTextOn: { color: Brand.primarySoft },
  pressed: { opacity: 0.8 },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three, flexGrow: 1 },
  skeletons: { paddingHorizontal: Spacing.three, gap: Spacing.four },
  skeletonCard: { gap: Spacing.two },
  footer: { paddingVertical: Spacing.three },
  sheetBody: { gap: Spacing.three, paddingBottom: Spacing.two },
  group: { gap: Spacing.two },
  groupTitle: { ...Typography.overline, fontSize: 12, color: Brand.textMuted },
});
