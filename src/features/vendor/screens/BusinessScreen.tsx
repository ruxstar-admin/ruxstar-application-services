import { useState } from 'react';
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
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { toUploadJpeg } from '@/features/profile/lib/profile-photo';
import { useBusinessCatalog } from '@/features/vendor/hooks/use-business-catalog';
import { canOpen } from '@/features/vendor/hooks/use-vendor-businesses';
import { BUSINESS_MODULES, MISSING_LABEL, listOf, statusOf } from '@/features/vendor/lib/business-modules';
import { addressOf, areaLine } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { BusinessService } from '@/services/business-service';
import type { Business } from '@/types/business';

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

function SetupStep({
  title,
  subtitle,
  done,
  icon,
  disabled,
  onPress,
}: {
  title: string;
  subtitle: string;
  /** A setup step; rows without it show `icon`. */
  done?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
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
      style={({ pressed }) => [styles.step, disabled && styles.stepDisabled, pressed && styles.pressed]}
    >
      <Ionicons
        name={step ? (done ? 'checkmark-circle' : 'ellipse-outline') : (icon ?? 'ellipse-outline')}
        size={22}
        color={done ? Brand.success : step ? Brand.textMuted : Brand.text}
      />
      <View style={styles.stepText}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.muted}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Brand.textFaint} />
    </Pressable>
  );
}

function Photos({ business, busy, onAdd, onRemove }: { business: Business; busy: string | null; onAdd: () => void; onRemove: (id: string) => void }) {
  const editable = !business.suspension;
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

/** One business: photos, details, publishing, and whether it is open. */
export function BusinessScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload, setData } = useAsyncResource(() => BusinessService.get(token, id), id);
  useRefetchOnFocus(reload);
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
    void run('photo', async () => BusinessService.addPhoto(token, id, await toUploadJpeg(asset, UPLOAD_SIDE)));
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

  return (
    <ScreenContainer title="Business">
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={5}>
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
              <View style={styles.note}>
                <Ionicons name="alert-circle-outline" size={20} color={Brand.error} />
                <Text style={styles.noteText}>
                  <Text style={styles.strong}>On hold by Ruxstar: </Text>
                  {data.suspension.reason} Customers can&apos;t see it and it can&apos;t be changed. Contact support to continue.
                </Text>
              </View>
            ) : !data.moduleLive ? (
              <View style={styles.note}>
                <Ionicons name="pause-circle-outline" size={20} color={Brand.warning} />
                <Text style={styles.noteText}>
                  Ruxstar has paused {BUSINESS_MODULES[data.module].label.toLowerCase()} for now. Customers can&apos;t order until it is back.
                </Text>
              </View>
            ) : null}

            {canOpen(data) ? (
              <View style={[styles.openCard, data.open && styles.openCardOn]}>
                <SegmentedTabs
                  options={OPEN_OPTIONS}
                  value={data.open ? 'open' : 'closed'}
                  onChange={(next) => {
                    if (busy || (next === 'open') === data.open) return;
                    const open = next === 'open';
                    setData({ ...data, open });
                    void run('open', () => BusinessService.setOpen(token, id, open));
                  }}
                />
                <Text style={styles.muted}>{data.open ? 'Customers can order and book now.' : 'Customers still see it, marked closed.'}</Text>
              </View>
            ) : null}

            <Photos business={data} busy={busy} onAdd={addPhoto} onRemove={(photoId) => run(photoId, () => BusinessService.removePhoto(token, id, photoId))} />

            {data.pod && !data.suspension ? (
              <View style={styles.steps}>
                <SetupStep
                  title="Products & delivery"
                  subtitle={data.pod.products.length ? `${data.pod.products.length} products · ${areaLine(data.pod)}` : 'Choose what you print and where you deliver'}
                  done={!data.missing.includes('products') && !data.missing.includes('area')}
                  onPress={() => router.push({ pathname: '/(vendor)/businesses/[id]/products', params: { id } })}
                />
                <SetupStep
                  title="Prices"
                  subtitle={
                    !data.pod.products.length
                      ? 'After you choose products'
                      : data.pod.unpriced.length
                        ? `${data.pod.unpriced.length} product${data.pod.unpriced.length === 1 ? '' : 's'} need a price`
                        : 'Every product has a price'
                  }
                  done={data.pod.products.length > 0 && !data.missing.includes('pricing')}
                  disabled={!data.pod.products.length}
                  onPress={() => router.push({ pathname: '/(vendor)/businesses/[id]/prices', params: { id } })}
                />
                <SetupStep
                  title="Team"
                  subtitle="Invite people to help with orders, the shop and posts"
                  icon="people-outline"
                  onPress={() => router.push({ pathname: '/(vendor)/businesses/[id]/team', params: { id } })}
                />
              </View>
            ) : null}

            <View style={styles.section}>
              <Detail label="About" value={data.description} />
              <Detail label="Phone" value={data.phone} />
              <Detail label="Location" value={addressOf(data.location)} />
              <Detail label="GSTIN" value={data.gstin ? `${data.gstin.number}${data.gstin.legalName ? ` · ${data.gstin.legalName}` : ''}` : null} />
              {!data.suspension ? (
                <PrimaryButton
                  label="Edit details"
                  variant="outline"
                  onPress={() => router.push({ pathname: '/(vendor)/businesses/[id]/details', params: { id } })}
                />
              ) : null}
            </View>

            {data.status === 'draft' && !data.suspension ? (
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
  photos: { flexDirection: 'row', gap: Spacing.two, marginVertical: Spacing.two },
  photo: { width: 100, height: 100, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: Brand.surfaceAlt },
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
  steps: { borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border, backgroundColor: Brand.surface, paddingHorizontal: Spacing.three },
  step: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 64, paddingVertical: Spacing.two },
  stepDisabled: { opacity: 0.5 },
  stepText: { flex: 1, gap: 2 },
  stepTitle: { ...Typography.bodyStrong, color: Brand.text },
});
