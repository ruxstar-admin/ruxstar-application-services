import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
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
import { timeAgo } from '@/lib/time';
import { AdminService } from '@/services/admin-service';
import type { AuditEntry, AuditFilter } from '@/types/admin';
import { useCan } from '../access';
import { FilterBar, FilterButton, OptionSheet, PeopleSearch } from '../components/filters';
import { Card, ListFooter, Row, consoleStyles, errorText } from '../components/parts';
import { WhenSheet } from '../components/WhenSheet';
import { ACTION_LABEL, AREA_LABEL } from '../labels';
import { NO_AUDIT_FILTER, auditFiltered, auditQuery, whenLabel, type AuditChoice } from '../lib/filters';

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

function Log({ filter, filtered }: { filter: AuditFilter; filtered: boolean }) {
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
      ListEmptyComponent={filtered ? <EmptyState icon="filter-outline" title="No entries for these filters" /> : <EmptyState icon="time-outline" title="Nothing logged yet" />}
      ListFooterComponent={<ListFooter list={list} />}
      renderItem={({ item }) => <Entry e={item} />}
    />
  );
}

/** Who did it: anyone, or one person found by phone number, @username or name. */
function WhoSheet({ visible, value, onPick, onClose }: { visible: boolean; value: string; onPick: (person: { id: string; label: string } | null) => void; onClose: () => void }) {
  const pick = (person: { id: string; label: string } | null) => {
    onPick(person);
    onClose();
  };
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Who">
      <PeopleSearch
        autoFocus
        maxHeight={360}
        selectedId={value}
        onPick={(p) => pick({ id: p.id, label: p.name || `@${p.username}` })}
        before={
          <ListRow
            title="Anyone"
            leading={
              <View style={styles.anyone}>
                <Ionicons name="people-outline" size={20} color={Brand.textMuted} />
              </View>
            }
            right={value ? <View /> : <Ionicons name="checkmark" size={20} color={Brand.primarySoft} />}
            onPress={() => pick(null)}
          />
        }
      />
    </BottomSheet>
  );
}

const AREAS = [{ key: '', label: 'Every area' }, ...Object.entries(AREA_LABEL).map(([key, label]) => ({ key, label }))];
const ACTIONS = [{ key: '', label: 'Every action' }, ...Object.entries(ACTION_LABEL).map(([key, label]) => ({ key, label }))];

type Sheet = 'when' | 'who' | 'area' | 'action' | 'target';

export function AuditScreen({ target: startTarget = '', actor: startActor = '' }: { target?: string; actor?: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const canSeePeople = useCan('users.view');
  const [state, setState] = useState(() => ({ choice: { ...NO_AUDIT_FILTER, target: startTarget, actor: startActor } as AuditChoice, at: Date.now() }));
  const [personLabel, setPersonLabel] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const { choice, at } = state;

  const change = (patch: Partial<AuditChoice>) => setState((s) => ({ choice: { ...s.choice, ...patch }, at: Date.now() }));

  // Opened from someone's account, only their id is known.
  useEffect(() => {
    if (!choice.actor || personLabel !== null || !canSeePeople) return;
    let live = true;
    AdminService.getAccount(token, choice.actor).then(
      (a) => live && setPersonLabel(a.name || `@${a.username}`),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [choice.actor, personLabel, canSeePeople, token]);

  const filter = auditQuery(choice, at);
  const filtered = auditFiltered(choice);
  const who = choice.actor ? (personLabel ?? `Person …${choice.actor.slice(-6)}`) : 'Anyone';

  return (
    <SafeAreaView style={styles.container}>
      <View style={consoleStyles.pad}>
        <ScreenHeader title="Audit log" onBack={() => router.back()} />
      </View>
      <FilterBar
        onClear={
          filtered
            ? () => {
                setPersonLabel(null);
                setState({ choice: NO_AUDIT_FILTER, at: Date.now() });
              }
            : undefined
        }
      >
        <FilterButton icon="calendar-outline" label={whenLabel(choice.when, at)} active={choice.when.kind !== 'any'} onPress={() => setSheet('when')} />
        {canSeePeople ? <FilterButton icon="person-outline" label={who} active={!!choice.actor} onPress={() => setSheet('who')} /> : null}
        <FilterButton label={choice.module ? (AREA_LABEL[choice.module] ?? choice.module) : 'Every area'} active={!!choice.module} onPress={() => setSheet('area')} />
        <FilterButton label={choice.action ? (ACTION_LABEL[choice.action] ?? choice.action) : 'Every action'} active={!!choice.action} onPress={() => setSheet('action')} />
        {choice.target ? <FilterButton label={`Only …${choice.target.slice(-6)}`} active onPress={() => setSheet('target')} /> : null}
      </FilterBar>
      <Log key={JSON.stringify(filter)} filter={filter} filtered={filtered} />

      <WhenSheet visible={sheet === 'when'} value={choice.when} onPick={(when) => change({ when })} onClose={() => setSheet(null)} />
      <WhoSheet
        visible={sheet === 'who'}
        value={choice.actor}
        onPick={(person) => {
          setPersonLabel(person?.label ?? null);
          change({ actor: person?.id ?? '' });
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet visible={sheet === 'area'} title="Area" options={AREAS} value={choice.module} onPick={(module) => change({ module })} onClose={() => setSheet(null)} />
      <OptionSheet visible={sheet === 'action'} title="Action" options={ACTIONS} value={choice.action} onPick={(action) => change({ action })} onClose={() => setSheet(null)} />
      <OptionSheet
        visible={sheet === 'target'}
        title="What changed"
        options={[
          { key: choice.target, label: `Only …${choice.target.slice(-6)}` },
          { key: '', label: 'Everything' },
        ]}
        value={choice.target}
        onPick={(target) => change({ target })}
        onClose={() => setSheet(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  detail: { gap: Spacing.two, paddingTop: Spacing.two },
  diff: { ...Typography.caption, color: Brand.text },
  field: { color: Brand.textMuted },
  anyone: { width: 40, height: 40, borderRadius: Radius.pill, backgroundColor: Brand.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
});
