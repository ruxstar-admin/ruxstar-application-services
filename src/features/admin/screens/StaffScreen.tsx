import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import { AdminService } from '@/services/admin-service';
import type { AccountRow, Permission, StaffMember } from '@/types/admin';
import { useAccess } from '../access';
import { Card, Note, Row, Section, consoleStyles, errorText } from '../components/parts';
import { PERMISSION_AREA } from '../labels';

/** A title plus the permissions it carries, grouped by section. */
function Grant({
  title: startTitle,
  permissions: startPermissions,
  confirm,
  onCancel,
  onSave,
}: {
  title: string;
  permissions: Permission[];
  confirm: string;
  onCancel: () => void;
  onSave: (title: string, permissions: Permission[]) => Promise<void>;
}) {
  const { catalog } = useAccess();
  const [title, setTitle] = useState(startTitle);
  const [picked, setPicked] = useState<Set<Permission>>(new Set(startPermissions));
  const [busy, setBusy] = useState(false);
  const areas = [...new Set(catalog.map((p) => p.key.split('.')[0]!))];

  const toggle = (key: Permission, on: boolean) =>
    setPicked((set) => {
      const next = new Set(set);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  const valid = title.trim().length >= 2 && picked.size > 0;

  return (
    <View style={styles.grant}>
      <InputField label="Title" hint="What they do, for example Support lead" value={title} onChangeText={setTitle} maxLength={60} />
      {areas.map((area) => (
        <View key={area}>
          <Section>{PERMISSION_AREA[area] ?? area}</Section>
          {catalog
            .filter((p) => p.key.startsWith(`${area}.`))
            .map((p) => (
              <ToggleRow key={p.key} title={p.label} value={picked.has(p.key)} onValueChange={(on) => toggle(p.key, on)} />
            ))}
        </View>
      ))}
      {picked.size === 0 ? <Text style={consoleStyles.muted}>Pick at least one permission.</Text> : null}
      <PrimaryButton
        label={confirm}
        disabled={!valid}
        loading={busy}
        onPress={async () => {
          setBusy(true);
          try {
            await onSave(
              title.trim(),
              catalog.map((p) => p.key).filter((k) => picked.has(k)),
            );
          } finally {
            setBusy(false);
          }
        }}
      />
      <PrimaryButton label="Cancel" variant="outline" onPress={onCancel} disabled={busy} />
    </View>
  );
}

/** Find the person to add. Admins and current staff are left out. */
function AddMember({ staff, onAdded, onCancel }: { staff: StaffMember[]; onAdded: (m: StaffMember) => void; onCancel: () => void }) {
  const token = useAuthToken();
  const [text, setText] = useState('');
  const [results, setResults] = useState<AccountRow[] | null>(null);
  const [chosen, setChosen] = useState<AccountRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());

  useEffect(() => {
    const q = text.trim();
    if (q.length < 2) return;
    let live = true;
    const t = setTimeout(() => {
      AdminService.findAccounts(token, q, 'active').then(
        (page) => {
          if (!live) return;
          const current = new Set(staff.filter((m) => m.status === 'active').map((m) => m.user.id));
          setError(null);
          setResults(page.items.filter((u) => !u.roles.admin && !current.has(u.id)).slice(0, 8));
        },
        (err) => live && setError(errorText(err)),
      );
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [text, staff, token]);

  if (chosen) {
    const before = staff.find((m) => m.user.id === chosen.id);
    return (
      <Card>
        <Row name={chosen.name || chosen.username} avatarUrl={chosen.avatarUrl} title={chosen.name || 'No name'} subtitle={`@${chosen.username}`} />
        {error ? <ErrorBanner message={error} /> : null}
        <Grant
          title={before?.title ?? ''}
          permissions={before?.permissions ?? []}
          confirm="Add to staff"
          onCancel={() => setChosen(null)}
          onSave={async (title, permissions) => {
            try {
              onAdded(await AdminService.saveStaff(token, chosen.id, title, permissions, key.current));
              Feedback.success();
            } catch (err) {
              Feedback.error();
              setError(errorText(err));
            }
          }}
        />
      </Card>
    );
  }

  return (
    <Card>
      <Text style={styles.subtitle}>Add a team member</Text>
      <InputField
        label="Find their account"
        hint="Phone number, @username or name. They need a Ruxstar account first."
        value={text}
        onChangeText={(value) => {
          setText(value);
          if (value.trim().length < 2) setResults(null);
        }}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error ? <ErrorBanner message={error} /> : null}
      {results ? (
        results.length === 0 ? (
          <Text style={consoleStyles.muted}>Nobody to add matches that.</Text>
        ) : (
          results.map((u) => (
            <Row key={u.id} name={u.name || u.username} avatarUrl={u.avatarUrl} title={u.name || 'No name'} subtitle={`@${u.username} · ${u.phone}`} onPress={() => setChosen(u)} />
          ))
        )
      ) : null}
      <PrimaryButton label="Cancel" variant="outline" onPress={onCancel} />
    </Card>
  );
}

function Member({ m, onChanged }: { m: StaffMember; onChanged: (m: StaffMember, message: string) => void }) {
  const token = useAuthToken();
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keys = useRef({ save: newIdempotencyKey(), remove: newIdempotencyKey() });
  const active = m.status === 'active';
  const name = m.user.name || 'They';

  return (
    <Card>
      <Row
        name={m.user.name || m.user.username}
        avatarUrl={m.user.avatarUrl}
        title={m.user.name || 'No name'}
        subtitle={`${m.title} · ${m.permissions.length === 1 ? '1 permission' : `${m.permissions.length} permissions`} · ${active ? `since ${timeAgo(m.grantedAt)}` : `removed ${timeAgo(m.updatedAt)}`}`}
        right={active ? null : <Badge label="Removed" />}
        onPress={() => setOpen(!open)}
      />
      {open ? (
        <>
          {error ? <ErrorBanner message={error} /> : null}
          <Grant
            title={m.title}
            permissions={m.permissions}
            confirm={active ? 'Save changes' : 'Bring back'}
            onCancel={() => setOpen(false)}
            onSave={async (title, permissions) => {
              setError(null);
              try {
                const done = await AdminService.saveStaff(token, m.user.id, title, permissions, keys.current.save);
                keys.current.save = newIdempotencyKey();
                Feedback.success();
                setOpen(false);
                onChanged(done, active ? 'Saved.' : `${name} are back on staff.`);
              } catch (err) {
                Feedback.error();
                setError(errorText(err));
              }
            }}
          />
          {active ? (
            <View style={styles.remove}>
              <Text style={consoleStyles.muted}>They lose console access at once. Their account stays as it is.</Text>
              <PrimaryButton
                label="Remove from staff"
                variant="outline"
                loading={removing}
                onPress={async () => {
                  setRemoving(true);
                  setError(null);
                  try {
                    const done = await AdminService.removeStaff(token, m.user.id, keys.current.remove);
                    keys.current.remove = newIdempotencyKey();
                    Feedback.success();
                    setOpen(false);
                    onChanged(done, `${name} removed from staff.`);
                  } catch (err) {
                    Feedback.error();
                    setError(errorText(err));
                  } finally {
                    setRemoving(false);
                  }
                }}
              />
            </View>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

export function StaffScreen() {
  return (
    <ScreenContainer title="Ruxstar staff">
      <StaffList />
    </ScreenContainer>
  );
}

function StaffList() {
  const token = useAuthToken();
  const { data: staff, loading, error, reload, setData } = useAsyncResource(() => AdminService.staff(token));
  const [adding, setAdding] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const put = (m: StaffMember) => {
    const rest = (staff ?? []).filter((x) => x.user.id !== m.user.id);
    setData(m.status === 'active' ? [m, ...rest] : [...rest, m]);
  };

  return (
    <>
      <Text style={consoleStyles.muted}>Give team members only the sections they need. Admins have everything and are not listed.</Text>
      {done ? <Note>{done}</Note> : null}
      <AsyncBoundary loading={loading} error={error} hasData={!!staff} onRetry={reload}>
        {staff ? (
          <>
            {adding ? (
              <AddMember
                staff={staff}
                onCancel={() => setAdding(false)}
                onAdded={(m) => {
                  put(m);
                  setAdding(false);
                  setDone(`${m.user.name || 'They'} added to staff.`);
                }}
              />
            ) : (
              <PrimaryButton label="Add a team member" onPress={() => setAdding(true)} />
            )}
            {staff.length === 0 ? (
              <EmptyState icon="people-outline" title="No staff yet" message="Add someone to share the work." />
            ) : (
              staff.map((m) => (
                <Member
                  key={m.user.id}
                  m={m}
                  onChanged={(changed, message) => {
                    put(changed);
                    setDone(message);
                  }}
                />
              ))
            )}
          </>
        ) : null}
      </AsyncBoundary>
    </>
  );
}

const styles = StyleSheet.create({
  grant: { gap: Spacing.two, paddingTop: Spacing.two },
  remove: { gap: Spacing.two, paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Brand.border },
  subtitle: { ...Typography.bodyStrong, color: Brand.text },
});
