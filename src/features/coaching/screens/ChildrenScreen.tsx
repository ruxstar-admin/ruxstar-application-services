import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { errorText } from '@/features/events/lib/messages';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { CoachingService } from '@/services/coaching-service';
import type { Child } from '@/types/coaching';
import { ChildForm } from '../components/ChildForm';
import { MAX_CHILDREN, childLine } from '../lib/children';

/** Children you enrol in classes: add them once, change a name, or remove one with nothing booked. */
export function ChildrenScreen() {
  const token = useAuthToken();
  const { data, loading, error, reload, setData } = useAsyncResource(() => CoachingService.children(token).then((p) => p.items), 'children');
  const [editing, setEditing] = useState<Child | 'new' | null>(null);
  const [removing, setRemoving] = useState<Child | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const children = data ?? [];

  const saved = (child: Child) => {
    setData((now) => (now?.some((c) => c.id === child.id) ? now.map((c) => (c.id === child.id ? child : c)) : [...(now ?? []), child]));
    setEditing(null);
  };

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    setFailure(null);
    try {
      await CoachingService.removeChild(token, removing.id);
      Feedback.success();
      setData((now) => (now ?? []).filter((c) => c.id !== removing.id));
      setEditing(null);
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
    } finally {
      setBusy(false);
      setRemoving(null);
    }
  };

  const footer = children.length < MAX_CHILDREN ? <PrimaryButton label="Add a child" onPress={() => setEditing('new')} /> : null;
  const child = editing && editing !== 'new' ? editing : null;

  return (
    <ScreenContainer title="My children" footer={data ? footer : null}>
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={3}>
        {children.length ? (
          <>
            <Text style={styles.lead}>Pick them when you enrol or book a demo. Only the institutes they’re enrolled with see their name.</Text>
            <View style={styles.list}>
              {children.map((c) => (
                <ListRow key={c.id} icon="person-outline" title={c.name} subtitle={childLine(c)} onPress={() => setEditing(c)} />
              ))}
            </View>
            {children.length >= MAX_CHILDREN ? <Text style={styles.small}>{`You can add up to ${MAX_CHILDREN} children.`}</Text> : null}
          </>
        ) : (
          <EmptyState icon="people-outline" title="No children added" message="Add your child to enrol them in classes. You can still enrol yourself without this." />
        )}
        {failure ? <ErrorBanner message={failure} /> : null}
      </AsyncBoundary>

      <BottomSheet visible={!!editing} onClose={() => setEditing(null)} title={child ? `Change ${child.name}` : 'Add a child'}>
        <View style={styles.sheet}>
          <ChildForm key={child?.id ?? 'new'} child={child ?? undefined} onSaved={saved} />
          {child ? (
            child.enrolments ? (
              <Text style={styles.small}>{`${child.name} has classes booked, so they can’t be removed yet.`}</Text>
            ) : (
              <TextLink muted label={`Remove ${child.name}`} onPress={() => setRemoving(child)} />
            )
          ) : null}
        </View>
      </BottomSheet>

      <ConfirmSheet
        visible={!!removing}
        title={`Remove ${removing?.name ?? 'this child'}?`}
        message="Their past enrolments and certificates stay in your classes."
        confirmLabel="Remove"
        loading={busy}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  lead: { ...Typography.body, fontSize: 15, color: Brand.textMuted },
  list: { paddingHorizontal: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, overflow: 'hidden' },
  small: { ...Typography.caption, color: Brand.textMuted },
  sheet: { gap: Spacing.three },
});
