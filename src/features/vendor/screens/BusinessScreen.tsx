import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
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
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Brand, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { toUploadJpeg } from '@/features/profile/lib/profile-photo';
import { ratingLine } from '@/features/reviews/lib/review';
import { contactSupport } from '@/features/support/lib/support';
import { useBusinessCatalog } from '@/features/vendor/hooks/use-business-catalog';
import { canOpen } from '@/features/vendor/hooks/use-vendor-businesses';
import { BUSINESS_MODULES, MISSING_LABEL, listOf, statusOf } from '@/features/vendor/lib/business-modules';
import { addressOf, areaLine } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { shopDesk } from '@/features/vendor/lib/shop-desk';
import { BusinessService } from '@/services/business-service';
import { WorkService } from '@/services/team-service';
import type { Business } from '@/types/business';
import type { TeamPermission } from '@/types/team';

/** Matches the API's cap. */
const MAX_PHOTOS = 3;
/** The API keeps business photos within 1440 px, like post photos. */
const UPLOAD_SIDE = 1440;
const OPEN_OPTIONS = [
  { key: 'open', label: 'Open' },
  { key: 'closed', label: 'Closed' },
] as const;

const messageOf = (err: unknown) =>
  err instanceof ApiError && err.kind !== 'network' && err.kind !== 'timeout' ? err.message : 'Could not reach Ruxstar. Check your connection and try again.';

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={value ? styles.detailValue : styles.detailEmpty}>{value ?? 'Not added'}</Text>
    </View>
  );
}

/** A big tile for one part of the business. A setup step (`done` set) shows whether it is done. */
function Tile({
  title,
  subtitle,
  done,
  icon,
  disabled,
  onPress,
}: {
  title: string;
  subtitle: string;
  done?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  onPress: () => void;
}) {
  const step = done !== undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={step ? `${title}, ${done ? 'done' : 'to do'}` : title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.tile, step && !done && styles.tileTodo, disabled && styles.stepDisabled, pressed && styles.pressed]}
    >
      <View style={styles.tileTop}>
        <View style={styles.tileIcon}>
          <Ionicons name={icon} size={26} color={Brand.primarySoft} />
        </View>
        {step ? (
          done ? (
            <Ionicons name="checkmark-circle" size={20} color={Brand.success} accessibilityElementsHidden />
          ) : (
            <Text style={styles.todo}>To do</Text>
          )
        ) : null}
      </View>
      <Text style={styles.stepTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.tileSubtitle} numberOfLines={2}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

function Photos({
  business,
  editable,
  busy,
  onAdd,
  onRemove,
}: {
  business: Business;
  editable: boolean;
  busy: string | null;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <View style={styles.photos}>
      {business.photos.map((photo, i) => (
        <View key={photo.id} style={styles.photo}>
          <Image source={{ uri: photo.url }} style={styles.photoImage} contentFit="cover" transition={150} />
          {i === 0 ? <Text style={styles.coverTag}>Cover</Text> : null}
          {editable ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
              hitSlop={8}
              onPress={() => onRemove(photo.id)}
              style={styles.removePhoto}
            >
              {busy === photo.id ? <ActivityIndicator size="small" color={Brand.text} /> : <Ionicons name="close" size={16} color={Brand.text} />}
            </Pressable>
          ) : null}
        </View>
      ))}
      {editable && business.photos.length < MAX_PHOTOS ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Add a photo" onPress={onAdd} style={({ pressed }) => [styles.photo, styles.addPhoto, pressed && styles.pressed]}>
          {busy === 'photo' ? <ActivityIndicator color={Brand.text} /> : <Ionicons name="add" size={28} color={Brand.textMuted} />}
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * One business: photos, details, publishing, and whether it is open. `team` opens it from Work, where `id` is the place there
 * and only what the owner allowed shows; publishing, deleting and the team stay with the owner.
 */
export function BusinessScreen({ team = false }: { team?: boolean }) {
  const router = useRouter();
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const desk = shopDesk(team);
  const { data, loading, error, reload, setData } = useAsyncResource(() => desk.service.get(token, id), id);
  const place = useAsyncResource(() => (team ? WorkService.get(token).then((w) => w.places.find((p) => p.id === id) ?? null) : Promise.resolve(null)), id);
  const reloadPlace = place.reload;
  useRefetchOnFocus(
    useCallback(() => {
      reload();
      reloadPlace();
    }, [reload, reloadPlace]),
  );
  const can = (permission: TeamPermission) => !team || !!place.data?.permissions.includes(permission);
  const catalog = useBusinessCatalog();
  const typeLabel = (b: Business) => {
    const category = catalog.data?.categories.find((c) => c.module === b.module);
    const type = category?.types.find((t) => t.id === b.type);
    return type ? `${category!.label} · ${type.label}` : BUSINESS_MODULES[b.module].label;
  };
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const run = async (name: string, action: () => Promise<Business>) => {
    setBusy(name);
    setFailure(null);
    try {
      setData(await action());
      Feedback.success();
    } catch (err) {
      Feedback.error();
      setFailure(messageOf(err));
      reload();
    } finally {
      setBusy(null);
    }
  };

  const addPhoto = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    const asset = picked.canceled ? null : picked.assets[0];
    if (!asset) return;
    void run('photo', async () => desk.service.addPhoto(token, id, await toUploadJpeg(asset, UPLOAD_SIDE)));
  };

  const remove = async () => {
    setBusy('delete');
    try {
      await BusinessService.remove(token, id);
      Feedback.success();
      setConfirmDelete(false);
      router.back();
    } catch (err) {
      Feedback.error();
      setConfirmDelete(false);
      setFailure(messageOf(err));
    } finally {
      setBusy(null);
    }
  };

  const catalogRows = !!data?.pod && !data.suspension && can('shop.catalog');
  const events = data?.module === 'events';
  const coaching = data?.module === 'coaching';
  return (
    <ScreenContainer title={team ? 'Shop' : 'Business'}>
      <AsyncBoundary loading={loading || place.loading} error={error ?? place.error} hasData={!!data} onRetry={reload} skeletonRows={5}>
        {data ? (
          <>
            <View style={styles.head}>
              <View style={styles.headText}>
                <Text style={styles.name}>{data.name}</Text>
                <Text style={styles.muted}>{typeLabel(data)}</Text>
              </View>
              <Badge {...statusOf(data)} />
            </View>

            {data.suspension ? (
              <>
                <View style={styles.note}>
                  <Ionicons name="alert-circle-outline" size={20} color={Brand.error} />
                  <Text style={styles.noteText}>
                    <Text style={styles.strong}>On hold by Ruxstar: </Text>
                    {data.suspension.reason} Customers can&apos;t see it and it can&apos;t be changed. Message support to ask for a review.
                  </Text>
                </View>
                <TextLink
                  label="Message support"
                  onPress={() => router.push(team ? contactSupport('business') : contactSupport('business', { type: 'business', id: data.id, label: data.name }))}
                />
              </>
            ) : !data.moduleLive ? (
              <View style={styles.note}>
                <Ionicons name="pause-circle-outline" size={20} color={Brand.warning} />
                <Text style={styles.noteText}>
                  Ruxstar has paused {BUSINESS_MODULES[data.module].label.toLowerCase()} for now. Customers can&apos;t order until it is back.
                </Text>
              </View>
            ) : null}

            {team && canOpen(data) && can('shop.open') ? (
              <View style={[styles.openCard, data.open && styles.openCardOn]}>
                <SegmentedTabs
                  options={OPEN_OPTIONS}
                  value={data.open ? 'open' : 'closed'}
                  onChange={(next) => {
                    if (busy || (next === 'open') === data.open) return;
                    const open = next === 'open';
                    setData({ ...data, open });
                    void run('open', () => desk.service.setOpen(token, id, open));
                  }}
                />
                <Text style={styles.muted}>{data.open ? 'Customers can order and book now.' : 'Customers still see it, marked closed.'}</Text>
              </View>
            ) : null}

            <Photos
              business={data}
              editable={!data.suspension && can('shop.details')}
              busy={busy}
              onAdd={addPhoto}
              onRemove={(photoId) => run(photoId, () => desk.service.removePhoto(token, id, photoId))}
            />
            {!data.suspension && can('shop.details') ? (
              <PrimaryButton label="Edit details" variant="outline" onPress={() => router.push({ pathname: desk.routes.details, params: { id } })} />
            ) : null}

            {catalogRows || !team ? (
              <View style={styles.tiles}>
                {catalogRows && data.pod ? (
                  <>
                    <Tile
                      title="Products & delivery"
                      icon="cube-outline"
                      subtitle={data.pod.products.length ? `${data.pod.products.length} products · ${areaLine(data.pod)}` : 'Choose what you print and where you deliver'}
                      done={!data.missing.includes('products') && !data.missing.includes('area')}
                      onPress={() => router.push({ pathname: desk.routes.products, params: { id } })}
                    />
                    <Tile
                      title="Prices"
                      icon="pricetag-outline"
                      subtitle={
                        !data.pod.products.length
                          ? 'After you choose products'
                          : data.pod.unpriced.length
                            ? `${data.pod.unpriced.length} product${data.pod.unpriced.length === 1 ? '' : 's'} need a price`
                            : 'Every product has a price'
                      }
                      done={data.pod.products.length > 0 && !data.missing.includes('pricing')}
                      disabled={!data.pod.products.length}
                      onPress={() => router.push({ pathname: desk.routes.prices, params: { id } })}
                    />
                  </>
                ) : null}
                {!team && events ? (
                  <>
                    <Tile
                      title="Events"
                      subtitle={data.status === 'live' ? 'Make events, sell tickets, see bookings' : 'Make events now; publish the business to sell'}
                      icon="calendar-outline"
                      disabled={!!data.suspension}
                      onPress={() => router.push({ pathname: '/(vendor)/businesses/[id]/events', params: { id } })}
                    />
                    <Tile title="Scan tickets" subtitle="Check people in at the gate, even offline" icon="qr-code-outline" onPress={() => router.push('/(customer)/gate')} />
                  </>
                ) : null}
                {!team && coaching ? (
                  <>
                    <Tile
                      title="Courses"
                      subtitle={data.status === 'live' ? 'Make courses and batches, see students' : 'Make courses now; publish the business to take enrolments'}
                      icon="school-outline"
                      disabled={!!data.suspension}
                      onPress={() => router.push({ pathname: '/(vendor)/businesses/[id]/courses', params: { id } })}
                    />
                    <Tile title="Today’s classes" subtitle="Take attendance, move or cancel a class, message a batch" icon="today-outline" onPress={() => router.push('/(customer)/teach')} />
                  </>
                ) : null}
                {!team && (data.pod || events || coaching) && !data.suspension ? (
                  <Tile
                    title={events ? 'Team & gate keepers' : coaching ? 'Team & coaches' : 'Team'}
                    subtitle={
                      events
                        ? 'Invite people to scan tickets or help run events'
                        : coaching
                          ? 'Invite coaches to take attendance, share materials and message batches'
                          : 'Invite people to help with orders, the shop and posts'
                    }
                    icon="people-outline"
                    onPress={() => router.push({ pathname: '/(vendor)/businesses/[id]/team', params: { id } })}
                  />
                ) : null}
                {!team && data.pod && data.status === 'live' ? (
                  <Tile
                    title="Reviews"
                    subtitle={ratingLine(data.rating)}
                    icon="star-outline"
                    onPress={() => router.push({ pathname: '/(vendor)/businesses/[id]/reviews', params: { id } })}
                  />
                ) : null}
                {!team && data.pod ? (
                  <Tile
                    title="Payment terms"
                    subtitle="Commission, fees and when you're paid"
                    icon="document-text-outline"
                    onPress={() => router.push({ pathname: '/(vendor)/businesses/[id]/terms', params: { id } })}
                  />
                ) : null}
                {!team && (data.pod || events || coaching) ? (
                  <Tile
                    title="GST invoices"
                    subtitle="Invoices and credit notes for its sales, and a CSV for your return"
                    icon="document-text-outline"
                    onPress={() => router.push({ pathname: '/(vendor)/invoices', params: { business: id, label: data.name } })}
                  />
                ) : null}
                {team ? null : (
                  <Tile
                    title="Activity"
                    subtitle="Who did what: you, your team, customers and Ruxstar"
                    icon="time-outline"
                    onPress={() => router.push({ pathname: '/(vendor)/businesses/[id]/activity', params: { id } })}
                  />
                )}
              </View>
            ) : null}

            <View style={styles.section}>
              <Detail label="About" value={data.description} />
              <Detail label="Phone" value={data.phone} />
              <Detail label="Location" value={addressOf(data.location)} />
              <Detail label="GSTIN" value={data.gstin ? `${data.gstin.number}${data.gstin.legalName ? ` · ${data.gstin.legalName}` : ''}` : null} />
            </View>

            {data.status === 'draft' && !data.suspension && !team ? (
              <View style={styles.publish}>
                <Text style={styles.muted}>
                  {data.missing.length
                    ? `To publish, add ${listOf(data.missing.map((m) => MISSING_LABEL[m]))}.`
                    : 'All set. Publishing lets customers find it and opens it straight away.'}
                </Text>
                <PrimaryButton
                  label="Publish"
                  loading={busy === 'publish'}
                  disabled={data.missing.length > 0 || !data.moduleLive}
                  onPress={() => run('publish', () => BusinessService.publish(token, id))}
                />
                <TextLink muted label="Delete this draft" onPress={() => setConfirmDelete(true)} />
              </View>
            ) : null}

            {failure ? <ErrorBanner message={failure} /> : null}

            <ConfirmSheet
              visible={confirmDelete}
              title="Delete this draft?"
              message={`${data.name} and its photos will be deleted. This can't be undone.`}
              confirmLabel="Delete"
              loading={busy === 'delete'}
              onConfirm={remove}
              onCancel={() => setConfirmDelete(false)}
            />
          </>
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  headText: { flex: 1, gap: 2 },
  name: { ...Typography.title, color: Brand.text },
  muted: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  strong: { fontFamily: Typography.bodyStrong.fontFamily, color: Brand.text },
  note: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  noteText: { ...Typography.caption, fontSize: 14, color: Brand.text, flex: 1 },
  photos: { flexDirection: 'row', gap: Spacing.two },
  photo: { width: '31.8%', aspectRatio: 1, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: Brand.surfaceAlt },
  photoImage: { width: '100%', height: '100%' },
  coverTag: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    backgroundColor: 'rgba(13,12,18,0.7)',
    color: Brand.text,
    fontSize: 11,
  },
  removePhoto: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13,12,18,0.7)',
  },
  addPhoto: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: Brand.border, backgroundColor: 'transparent' },
  pressed: { opacity: 0.7 },
  section: { gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  detail: { gap: 2 },
  detailLabel: { ...Typography.caption, color: Brand.textMuted },
  detailValue: { ...Typography.body, color: Brand.text },
  detailEmpty: { ...Typography.body, color: Brand.textFaint },
  publish: { gap: Spacing.two, paddingTop: Spacing.two },
  openCard: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border, backgroundColor: Brand.surface },
  openCardOn: { borderColor: 'rgba(52,199,89,0.45)' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: Spacing.three },
  tile: {
    width: '48%',
    minHeight: 140,
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  tileTodo: { borderColor: 'rgba(255,176,32,0.45)' },
  tileTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing.two },
  tileIcon: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(180,92,242,0.14)' },
  todo: { ...Typography.caption, fontSize: 11, fontFamily: Fonts.semibold, color: Brand.warning },
  tileSubtitle: { ...Typography.caption, fontSize: 12, color: Brand.textMuted },
  stepDisabled: { opacity: 0.5 },
  stepTitle: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
});
