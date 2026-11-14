import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { ShopCover } from '@/features/pod/components/ShopCover';
import { toUploadJpeg } from '@/features/profile/lib/profile-photo';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { VendorEventsService } from '@/services/events-service';
import type { VendorEvent } from '@/types/events';
import { EVENT_STATUS, KIND_LABEL, soldLine, whenLine } from '../lib/events';
import { errorText } from '../lib/messages';

/** Posters are 16:9 on the event card; the API keeps them within 1440 px. */
const POSTER_SIDE = 1440;
const POSTER_ASPECT = 16 / 9;

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Row({ icon, title, subtitle, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={22} color={Brand.primarySoft} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.small}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Brand.textFaint} />
    </Pressable>
  );
}

function Dashboard({ event, setEvent, reload, fresh }: { event: VendorEvent; setEvent: (e: VendorEvent) => void; reload: () => void; fresh: boolean }) {
  const router = useRouter();
  const token = useAuthToken();
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const status = EVENT_STATUS[event.status];
  const draft = event.status === 'draft';
  const open = event.status === 'draft' || event.status === 'live';

  const run = async (name: string, action: () => Promise<VendorEvent>) => {
    setBusy(name);
    setFailure(null);
    try {
      setEvent(await action());
      Feedback.success();
      return true;
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
      reload();
      return false;
    } finally {
      setBusy(null);
    }
  };

  const poster = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 1 });
    const asset = picked.canceled ? null : picked.assets[0];
    if (!asset) return;
    void run('photo', async () => VendorEventsService.setPhoto(token, event.id, await toUploadJpeg(asset, POSTER_SIDE, POSTER_ASPECT)));
  };

  const cancel = async () => {
    const done = await run('cancel', () => VendorEventsService.cancel(token, event.id, reason.trim(), { idempotencyKey: newIdempotencyKey() }));
    if (done) setCancelling(false);
  };

  const remove = async () => {
    setBusy('delete');
    try {
      await VendorEventsService.remove(token, event.id);
      Feedback.success();
      setDeleting(false);
      router.back();
    } catch (err) {
      Feedback.error();
      setDeleting(false);
      setFailure(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const footer = draft ? (
    <PrimaryButton
      label="Publish and start selling"
      loading={busy === 'publish'}
      disabled={event.missing.length > 0}
      onPress={() => run('publish', () => VendorEventsService.publish(token, event.id, { idempotencyKey: newIdempotencyKey() }))}
    />
  ) : event.status === 'live' && !event.online ? (
    <PrimaryButton label="Scan tickets" onPress={() => router.push({ pathname: '/(customer)/gate/[id]', params: { id: event.id } })} />
  ) : null;

  return (
    <ScreenContainer title="Event" footer={footer}>
      {fresh && draft ? (
        <View style={styles.note}>
          <Ionicons name="checkmark-circle" size={20} color={Brand.success} />
          <Text style={styles.noteText}>Saved as a draft. Add a poster, then publish it to start selling.</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={event.photo ? 'Change the poster' : 'Add a poster'}
        disabled={!open || busy === 'photo'}
        onPress={poster}
        style={({ pressed }) => [styles.poster, pressed && styles.pressed]}
      >
        <ShopCover photo={event.photo ? { ...event.photo, smaller: [] } : null} name={event.title} width={400} style={styles.posterImage}>
          {open ? (
            <View style={styles.posterButton}>
              {busy === 'photo' ? <ActivityIndicator color={Brand.text} size="small" /> : <Ionicons name="image-outline" size={16} color={Brand.text} />}
              <Text style={styles.posterText}>{event.photo ? 'Change poster' : 'Add a poster'}</Text>
            </View>
          ) : null}
        </ShopCover>
      </Pressable>

      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.small}>{`${KIND_LABEL[event.kind]} · ${whenLine(event.startsAt, event.endsAt)}`}</Text>
          <Text style={styles.small}>{event.online ? 'Online' : [event.venue?.name, event.venue?.city].filter(Boolean).join(', ')}</Text>
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>

      {event.cancellation ? (
        <View style={styles.note}>
          <Ionicons name="close-circle-outline" size={20} color={Brand.error} />
          <Text style={styles.noteText}>
            {`${event.cancellation.by === 'staff' ? 'Ruxstar took this event down' : 'You cancelled this event'}: ${event.cancellation.reason} Everyone who booked is refunded in full.`}
          </Text>
        </View>
      ) : null}

      {draft && event.missing.length ? (
        <View style={styles.note}>
          <Ionicons name="list-outline" size={20} color={Brand.warning} />
          <View style={styles.missing}>
            <Text style={styles.noteStrong}>Before you can publish</Text>
            {event.missing.map((m) => (
              <Text key={m} style={styles.noteText}>{`• ${m}`}</Text>
            ))}
          </View>
        </View>
      ) : null}

      {draft ? null : (
        <View style={styles.stats}>
          <Stat value={String(event.counts.tickets)} label="Tickets" />
          <Stat value={String(event.counts.checkedIn)} label="In today" />
          <Stat value={money(event.money.share)} label="Your share" />
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.rowTitle}>{soldLine(event)}</Text>
        {event.tiers.map((t) => (
          <View key={t.id} style={styles.tier}>
            <View style={styles.rowText}>
              <Text style={styles.body}>{t.name}</Text>
              <Text style={styles.small}>{`${t.price ? money(t.price) : 'Free'}${t.held ? ` · ${t.held} being paid for` : ''}`}</Text>
            </View>
            <Text style={styles.body}>{`${t.sold} / ${t.capacity}`}</Text>
          </View>
        ))}
        {event.counts.waiting ? <Text style={styles.small}>{`${event.counts.waiting} on the waitlist`}</Text> : null}
      </View>

      <View style={styles.rows}>
        {draft ? null : (
          <Row
            icon="people-outline"
            title="Bookings"
            subtitle="Who booked, their answers, and who came in"
            onPress={() => router.push({ pathname: '/(vendor)/events/[id]/bookings', params: { id: event.id } })}
          />
        )}
        {open ? (
          <Row icon="create-outline" title="Edit details" subtitle="Name, time, venue, ticket types and questions" onPress={() => router.push({ pathname: '/(vendor)/events/[id]/edit', params: { id: event.id } })} />
        ) : null}
        {event.status === 'live' && !event.online ? (
          <Row
            icon="shield-checkmark-outline"
            title="Gate keepers"
            subtitle="Invite people who only scan tickets"
            onPress={() => router.push({ pathname: '/(vendor)/businesses/[id]/team', params: { id: event.business.id } })}
          />
        ) : null}
      </View>

      {failure ? <ErrorBanner message={failure} /> : null}

      {event.status === 'live' ? <TextLink muted label="Cancel this event" onPress={() => setCancelling(true)} /> : null}
      {draft ? <TextLink muted label="Delete this draft" onPress={() => setDeleting(true)} /> : null}

      <BottomSheet visible={cancelling} onClose={() => setCancelling(false)} title="Cancel this event?">
        <Text style={styles.sheetText}>
          {event.counts.tickets
            ? `All ${event.counts.tickets} tickets are cancelled and everyone gets a full refund, platform fee included. This can’t be undone.`
            : 'It comes off sale for good. This can’t be undone.'}
        </Text>
        <InputField label="Tell people why" value={reason} onChangeText={setReason} maxLength={300} placeholder="e.g. Heavy rain is forecast" multiline />
        <PrimaryButton label="Cancel the event" loading={busy === 'cancel'} disabled={reason.trim().length < 5} onPress={cancel} />
        <PrimaryButton label="Keep it" variant="outline" onPress={() => setCancelling(false)} disabled={busy === 'cancel'} />
      </BottomSheet>

      <ConfirmSheet
        visible={deleting}
        title="Delete this draft?"
        message={`${event.title} will be deleted. This can’t be undone.`}
        confirmLabel="Delete"
        loading={busy === 'delete'}
        onConfirm={remove}
        onCancel={() => setDeleting(false)}
      />
    </ScreenContainer>
  );
}

/** An organiser's event: poster, publishing, sales by ticket type, check-ins, and cancelling. */
export function ManageEventScreen() {
  const token = useAuthToken();
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const { data, loading, error, reload, setData } = useAsyncResource(() => VendorEventsService.get(token, id), id);
  useRefetchOnFocus(useCallback(() => reload(), [reload]));
  return data ? (
    <Dashboard event={data} setEvent={setData} reload={reload} fresh={fresh === '1'} />
  ) : (
    <ScreenContainer title="Event">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={5}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  poster: { borderRadius: Radius.lg, overflow: 'hidden' },
  posterImage: { width: '100%', aspectRatio: 16 / 9 },
  posterButton: {
    position: 'absolute',
    right: Spacing.two,
    bottom: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(13,12,18,0.78)',
  },
  posterText: { ...Typography.caption, fontSize: 13, color: Brand.text },
  head: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  headText: { flex: 1, gap: 2 },
  title: { ...Typography.title, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
  body: { ...Typography.body, fontSize: 15, color: Brand.text },
  note: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  noteText: { ...Typography.caption, fontSize: 14, color: Brand.text, flex: 1 },
  noteStrong: { ...Typography.bodyStrong, fontSize: 14, color: Brand.text },
  missing: { flex: 1, gap: 2 },
  stats: { flexDirection: 'row', gap: Spacing.two },
  stat: { flex: 1, gap: 2, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  statValue: { ...Typography.heading, color: Brand.text },
  statLabel: { ...Typography.caption, color: Brand.textMuted },
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  tier: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  rows: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  rowIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(180,92,242,0.14)' },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  sheetText: { ...Typography.body, color: Brand.textMuted },
});
