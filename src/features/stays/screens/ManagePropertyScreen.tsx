import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Notice, Section } from '@/features/coaching/components/Parts';
import { errorText } from '@/features/events/lib/messages';
import { ShopCover } from '@/features/pod/components/ShopCover';
import { toUploadJpeg } from '@/features/profile/lib/profile-photo';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { VendorStaysService } from '@/services/stays-service';
import type { StayPhoto, VendorProperty } from '@/types/stays';
import { RoomCard } from '../components/RoomCard';
import { MAX_PHOTOS } from '../lib/forms';
import { KIND_LABEL, PROPERTY_STATUS, foodText, forText, noticeText, plural } from '../lib/stays';

/** Property photos are 16:9 like the cover; the API keeps them within 1440 px. */
const PHOTO_SIDE = 1440;
const PHOTO_ASPECT = 16 / 9;

type Icon = keyof typeof Ionicons.glyphMap;

function Row({ icon, title, subtitle, onPress }: { icon: Icon; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
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

function Photos({ property, busy, onAdd, onRemove }: { property: VendorProperty; busy: boolean; onAdd: () => void; onRemove: (p: StayPhoto) => void }) {
  const open = property.status !== 'removed';
  return (
    <View style={styles.photos}>
      {property.photos.map((p, i) => (
        <View key={p.id} style={styles.thumb}>
          <ShopCover photo={{ ...p, smaller: [] }} name={property.name} width={160} style={styles.thumbImage} />
          {i === 0 ? <Text style={styles.cover}>Cover</Text> : null}
          {open ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove photo ${i + 1}`} hitSlop={8} onPress={() => onRemove(p)} style={styles.remove}>
              <Ionicons name="close" size={16} color={Brand.text} />
            </Pressable>
          ) : null}
        </View>
      ))}
      {open && property.photos.length < MAX_PHOTOS ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Add a photo" disabled={busy} onPress={onAdd} style={({ pressed }) => [styles.thumb, styles.add, pressed && styles.pressed]}>
          {busy ? <ActivityIndicator color={Brand.primarySoft} /> : <Ionicons name="camera-outline" size={24} color={Brand.primarySoft} />}
          <Text style={styles.small}>{busy ? 'Uploading' : 'Add photo'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Dashboard({ property, setProperty, reload, fresh }: { property: VendorProperty; setProperty: (p: VendorProperty) => void; reload: () => void; fresh: boolean }) {
  const router = useRouter();
  const token = useAuthToken();
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dropping, setDropping] = useState<StayPhoto | null>(null);
  const status = PROPERTY_STATUS[property.status];
  const draft = property.status === 'draft';
  const open = property.status !== 'removed';
  const beds = property.rooms.reduce((n, r) => n + r.beds, 0);
  const editRoom = (roomId?: string) => router.push({ pathname: '/(vendor)/properties/[id]/room', params: roomId ? { id: property.id, roomId } : { id: property.id } });
  const desk = (pathname: '/(customer)/stays-desk/[id]' | '/(customer)/stays-desk/[id]/reservations' | '/(customer)/stays-desk/[id]/tenants') =>
    router.push({ pathname, params: { id: property.id } });

  const run = async (name: string, action: () => Promise<VendorProperty>) => {
    setBusy(name);
    setFailure(null);
    try {
      setProperty(await action());
      Feedback.success();
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
      reload();
    } finally {
      setBusy(null);
    }
  };

  const addPhoto = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 1 });
    const asset = picked.canceled ? null : picked.assets[0];
    if (!asset) return;
    void run('photo', async () => VendorStaysService.addPhoto(token, property.id, await toUploadJpeg(asset, PHOTO_SIDE, PHOTO_ASPECT)));
  };

  const dropPhoto = async () => {
    const photo = dropping;
    setDropping(null);
    if (photo) await run('photo', () => VendorStaysService.removePhoto(token, property.id, photo.id));
  };

  const remove = async () => {
    setBusy('delete');
    try {
      await VendorStaysService.remove(token, property.id);
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
      label="Publish"
      loading={busy === 'publish'}
      disabled={property.missing.length > 0}
      onPress={() => run('publish', () => VendorStaysService.publish(token, property.id, { idempotencyKey: newIdempotencyKey() }))}
    />
  ) : property.status === 'live' ? (
    <PrimaryButton label="Open the bed map" variant="outline" onPress={() => desk('/(customer)/stays-desk/[id]')} />
  ) : null;

  return (
    <ScreenContainer title={KIND_LABEL[property.kind]} footer={footer}>
      {fresh && draft ? <Notice tone="success" text="Saved as a draft. Add photos and at least one room, then publish." /> : null}

      <View style={styles.head}>
        <View style={styles.rowText}>
          <Text style={styles.title}>{property.name}</Text>
          <Text style={styles.small}>{property.address}</Text>
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>

      {property.removal ? <Notice tone="error" text={`Ruxstar took this place down: ${property.removal.reason} Reservations not moved in yet were cancelled and refunded.`} /> : null}

      {draft && property.missing.length ? (
        <View style={styles.note}>
          <Ionicons name="list-outline" size={20} color={Brand.warning} />
          <View style={styles.missing}>
            <Text style={styles.noteStrong}>Before you can publish</Text>
            {property.missing.map((m) => (
              <Text key={m} style={styles.noteText}>{`• ${m}`}</Text>
            ))}
          </View>
        </View>
      ) : null}

      {draft ? null : <Text style={styles.text}>{`${plural(beds, 'bed')} · ${property.staying} staying · ${property.upcoming} to move in`}</Text>}

      <Section title={`Photos (${property.photos.length} of ${MAX_PHOTOS})`} />
      <Photos property={property} busy={busy === 'photo'} onAdd={addPhoto} onRemove={setDropping} />
      <Text style={styles.small}>The first photo is the cover tenants see in the list. Show the rooms, the beds, the bathroom and the outside.</Text>

      <Section title="The place" />
      <Text style={styles.text}>{[forText(property.for, property.occupants), foodText(property.food), noticeText(property.noticeDays)].join(' · ')}</Text>
      {property.facilities.length ? <Text style={styles.small}>{property.facilities.map((f) => f.name).join(' · ')}</Text> : null}

      <Section title="Rooms" />
      {property.rooms.length ? (
        property.rooms.map((r) => (
          <RoomCard key={r.id} room={r}>
            {open ? <TextLink label="Edit room" onPress={() => editRoom(r.id)} /> : null}
          </RoomCard>
        ))
      ) : (
        <Text style={styles.small}>A room has its beds, its price per month or night, and what it has. Add at least one.</Text>
      )}
      {open ? <TextLink label="Add a room" onPress={() => editRoom()} /> : null}

      <View style={styles.rows}>
        {open ? (
          <Row
            icon="create-outline"
            title="Edit details"
            subtitle="Name, address, food, facilities, rules, deposit and refunds"
            onPress={() => router.push({ pathname: '/(vendor)/properties/[id]/edit', params: { id: property.id } })}
          />
        ) : null}
        {draft ? null : (
          <>
            <Row icon="receipt-outline" title="Reservations" subtitle={`${property.upcoming} to move in`} onPress={() => desk('/(customer)/stays-desk/[id]/reservations')} />
            <Row icon="people-outline" title="Tenants" subtitle={`${property.staying} staying now`} onPress={() => desk('/(customer)/stays-desk/[id]/tenants')} />
          </>
        )}
        <Row
          icon="person-add-outline"
          title="Team & wardens"
          subtitle="Invite wardens to run the bed map, move tenants in and out and change prices"
          onPress={() => router.push({ pathname: '/(vendor)/businesses/[id]/team', params: { id: property.business.id } })}
        />
      </View>

      {failure ? <ErrorBanner message={failure} /> : null}

      {draft ? <TextLink muted label="Delete this draft" onPress={() => setDeleting(true)} /> : null}

      <ConfirmSheet
        visible={deleting}
        title="Delete this draft?"
        message={`${property.name} and its rooms will be deleted. This can’t be undone.`}
        confirmLabel="Delete"
        loading={busy === 'delete'}
        onConfirm={remove}
        onCancel={() => setDeleting(false)}
      />
      <ConfirmSheet
        visible={!!dropping}
        title="Remove this photo?"
        message="Tenants won’t see it any more."
        confirmLabel="Remove"
        onConfirm={dropPhoto}
        onCancel={() => setDropping(null)}
      />
    </ScreenContainer>
  );
}

/** An owner's PG or hostel: photos, publishing, rooms, and links to its bed map, reservations, tenants and wardens. */
export function ManagePropertyScreen() {
  const token = useAuthToken();
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const { data, loading, error, reload, setData } = useAsyncResource(() => VendorStaysService.get(token, id), id);
  useRefetchOnFocus(useCallback(() => reload(), [reload]));
  return data ? (
    <Dashboard property={data} setProperty={setData} reload={reload} fresh={fresh === '1'} />
  ) : (
    <ScreenContainer title="Property">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={5}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  head: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  title: { ...Typography.title, color: Brand.text },
  text: { ...Typography.body, fontSize: 15, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
  note: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  noteText: { ...Typography.caption, fontSize: 14, color: Brand.text, flex: 1 },
  noteStrong: { ...Typography.bodyStrong, fontSize: 14, color: Brand.text },
  missing: { flex: 1, gap: 2 },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  thumb: { width: '31%', aspectRatio: 16 / 9, borderRadius: Radius.md, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  cover: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    paddingHorizontal: 6,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    backgroundColor: 'rgba(13,12,18,0.78)',
    ...Typography.caption,
    fontSize: 11,
    color: Brand.text,
  },
  remove: { position: 'absolute', top: 4, right: 4, width: 28, height: 28, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(13,12,18,0.78)' },
  add: { alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 1, borderStyle: 'dashed', borderColor: Brand.border, backgroundColor: Brand.surface },
  rows: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  rowIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(180,92,242,0.14)' },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
});
