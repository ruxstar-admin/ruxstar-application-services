import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import { AdminService } from '@/services/admin-service';
import type { AuditEntry, AuditFilter } from '@/types/admin';
import { useCan } from '../access';
import { Card, Row, consoleStyles, errorText } from '../components/parts';
import { ACTION_LABEL, AREA_LABEL } from '../labels';

const show = (value: unknown) => (value === undefined || value === null ? '—' : typeof value === 'string' ? value : JSON.stringify(value));
const exact = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

function Entry({ e }: { e: AuditEntry }) {
  const router = useRouter();
  const canSeePeople = useCan('users.view');
  const [open, setOpen] = useState(false);
  const changes = Object.entries(e.diff);
  const who = e.actor.kind === 'system' ? 'Ruxstar' : (e.actor.name ?? 'Someone');
  const target = `${e.target.type.replace(/_/g, ' ')} ${e.target.id.slice(-6)}`;

  return (
    <Card>
      <Row
        name={who}
        title={ACTION_LABEL[e.action] ?? e.action}
        subtitle={`${who}${e.actor.username ? ` (@${e.actor.username})` : ''} · ${AREA_LABEL[e.module] ?? e.module} · ${timeAgo(e.at)}`}
        right={e.actor.kind !== 'user' ? <Badge label={e.actor.kind === 'admin' ? 'Admin' : e.actor.kind === 'staff' ? 'Staff' : 'System'} tone={e.actor.kind === 'admin' ? 'accent' : 'neutral'} /> : null}
        onPress={() => setOpen(!open)}
      />
      {open ? (
        <View style={styles.detail}>
          <Text style={consoleStyles.muted} selectable>
            {exact(e.at)} · on {target}
            {e.ip ? ` · from ${e.ip}` : ''}
          </Text>
          {changes.length > 0 ? (
            changes.map(([field, c]) => (
              <Text key={field} style={styles.diff} selectable>
                <Text style={styles.field}>{field}: </Text>
                {show(c.from)} → {show(c.to)}
              </Text>
            ))
          ) : (
            <Text style={consoleStyles.muted}>No fields changed.</Text>
          )}
          {e.target.type === 'user' && canSeePeople ? (
            <TextLink label="Open this account" onPress={() => router.push({ pathname: '/(admin)/account/[id]', params: { id: e.target.id } })} />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function Log({ filter }: { filter: AuditFilter }) {
  const token = useAuthToken();
  const list = usePaginated((cursor) => AdminService.audit(token, filter, cursor));

  if (list.loading) {
    return (
      <View style={consoleStyles.skeletons}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height={68} radius={14} />
        ))}
      </View>
    );
  }
  if (list.error && list.items.length === 0) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load the log" message={errorText(list.error)} actionLabel="Try again" onAction={list.retry} />;
  }

  return (
    <FlatList
      data={list.items}
      keyExtractor={(e) => e.id}
      contentContainerStyle={consoleStyles.list}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={<EmptyState icon="time-outline" title="Nothing logged" message="Nothing matches this filter yet." />}
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={consoleStyles.footer} /> : null}
      renderItem={({ item }) => <Entry e={item} />}
    />
  );
}

function Chip({ label, active, onPress, clear }: { label: string; active: boolean; onPress: () => void; clear?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons name={clear ? 'close' : 'chevron-down'} size={14} color={active ? Brand.text : Brand.textMuted} />
    </Pressable>
  );
}

function Picker({ visible, title, options, value, onPick, onClose }: { visible: boolean; title: string; options: [string, string][]; value: string; onPick: (v: string) => void; onClose: () => void }) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <ScrollView style={styles.picker}>
        {options.map(([v, label]) => (
          <ListRow
            key={v || 'all'}
            title={label}
            right={v === value ? <Ionicons name="checkmark" size={20} color={Brand.primarySoft} /> : <View />}
            onPress={() => {
              onPick(v);
              onClose();
            }}
          />
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

const AREAS: [string, string][] = [['', 'Every area'], ...Object.entries(AREA_LABEL)];
const ACTIONS: [string, string][] = [['', 'Every action'], ...Object.entries(ACTION_LABEL)];

export function AuditScreen({ target: startTarget = '', actor: startActor = '' }: { target?: string; actor?: string }) {
  const router = useRouter();
  const [area, setArea] = useState('');
  const [action, setAction] = useState('');
  const [target, setTarget] = useState(startTarget);
  const [actor, setActor] = useState(startActor);
  const [picking, setPicking] = useState<'area' | 'action' | null>(null);

  const filter: AuditFilter = {
    ...(area ? { module: area } : {}),
    ...(action ? { action } : {}),
    ...(target ? { target } : {}),
    ...(actor ? { actor } : {}),
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={consoleStyles.pad}>
        <ScreenHeader title="Audit log" onBack={() => router.back()} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipRow}>
        <Chip label={area ? (AREA_LABEL[area] ?? area) : 'Every area'} active={!!area} onPress={() => setPicking('area')} />
        <Chip label={action ? (ACTION_LABEL[action] ?? action) : 'Every action'} active={!!action} onPress={() => setPicking('action')} />
        {target ? <Chip label={`Only ${target.slice(-6)}`} active clear onPress={() => setTarget('')} /> : null}
        {actor ? <Chip label={`By ${actor.slice(-6)}`} active clear onPress={() => setActor('')} /> : null}
      </ScrollView>
      <Log key={`${area}|${action}|${target}|${actor}`} filter={filter} />

      <Picker visible={picking === 'area'} title="Area" options={AREAS} value={area} onPick={setArea} onClose={() => setPicking(null)} />
      <Picker visible={picking === 'action'} title="Action" options={ACTIONS} value={action} onPick={setAction} onClose={() => setPicking(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  chipRow: { flexGrow: 0 },
  chips: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  chip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, height: 36, paddingHorizontal: Spacing.three, borderRadius: Radius.pill, backgroundColor: Brand.surfaceAlt },
  chipActive: { backgroundColor: Brand.border },
  chipText: { ...Typography.caption, color: Brand.textMuted, maxWidth: 200 },
  chipTextActive: { color: Brand.text },
  pressed: { opacity: 0.7 },
  picker: { maxHeight: 420 },
  detail: { gap: Spacing.two, paddingTop: Spacing.two },
  diff: { ...Typography.caption, color: Brand.text },
  field: { color: Brand.textMuted },
});
