import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
import { toUploadJpeg } from '@/features/profile/lib/profile-photo';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { Feedback } from '@/lib/haptics';
import { FreelanceService } from '@/services/gigs-service';
import type { GigPhoto, MyGig } from '@/types/gigs';
import { PhotoGrid } from '../components/PhotoGrid';
import { useGigLimits } from '../hooks/use-gigs';
import { GIG_STATUS, deliveryLine, sortedPackages } from '../lib/gigs';

const PHOTO_SIDE = 1440;
const PHOTO_ASPECT = 16 / 9;

type Busy = 'photo' | 'publish' | 'pause' | 'delete' | null;

function Dashboard({ gig, setGig, reload, fresh }: { gig: MyGig; setGig: (g: MyGig) => void; reload: () => void; fresh: boolean }) {
  const router = useRouter();
  const token = useAuthToken();
  const [busy, setBusy] = useState<Busy>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dropping, setDropping] = useState<GigPhoto | null>(null);
  const maxPhotos = useGigLimits().gigPhotos;
  const status = GIG_STATUS[gig.status];
  const removed = gig.status === 'removed';
  const needsKyc = gig.missing.some((m) => /verif/i.test(m));

  const run = async (name: Busy, action: () => Promise<MyGig>) => {
    setBusy(name);
    setFailure(null);
    try {
      setGig(await action());
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
    if (asset) void run('photo', async () => FreelanceService.addPhoto(token, gig.id, await toUploadJpeg(asset, PHOTO_SIDE, PHOTO_ASPECT)));
  };

  const dropPhoto = async () => {
    const photo = dropping;
    setDropping(null);
    if (photo) await run('photo', () => FreelanceService.removePhoto(token, gig.id, photo.id));
  };

  const remove = async () => {
    setBusy('delete');
    try {
      await FreelanceService.removeGig(token, gig.id);
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

  const publish = () => run('publish', () => FreelanceService.publish(token, gig.id));
  const footer = removed ? null : gig.status === 'live' ? (
    <PrimaryButton label="Pause this gig" variant="outline" loading={busy === 'pause'} onPress={() => run('pause', () => FreelanceService.pause(token, gig.id))} />
  ) : needsKyc ? (
    <PrimaryButton label="Verify to publish" onPress={() => router.push('/(customer)/settings/verification')} />
  ) : (
    <PrimaryButton label={gig.status === 'paused' ? 'Publish again' : 'Publish gig'} loading={busy === 'publish'} disabled={gig.missing.length > 0} onPress={publish} />
  );

  return (
    <ScreenContainer title="Gig" footer={footer}>
      {fresh && gig.status === 'draft' ? <Notice tone="success" text="Saved as a draft. Add a photo, then publish it." /> : null}
      <View style={styles.head}>
        <Text style={[styles.title, styles.flex]}>{gig.title}</Text>
        <Badge label={status.label} tone={status.tone} />
      </View>
      <Text style={styles.small}>{`${gig.categoryLabel}${gig.orders ? ` · ${gig.orders} order${gig.orders === 1 ? '' : 's'}` : ''}`}</Text>

      {gig.removal ? <Notice tone="error" text={`Ruxstar took this gig down: ${gig.removal.reason} Orders already placed go on.`} /> : null}
      {gig.status === 'paused' ? <Notice tone="warning" text="Paused: customers can’t see or order it. Orders already placed go on." /> : null}
      {gig.missing.length ? (
        <View style={styles.note}>
          <Ionicons name="list-outline" size={20} color={Brand.warning} />
          <View style={styles.flex}>
            <Text style={styles.noteStrong}>Before you can publish</Text>
            {gig.missing.map((m) => (
              <Text key={m} style={styles.noteText}>{`• ${m}`}</Text>
            ))}
          </View>
        </View>
      ) : null}

      <Section title={`Photos (${gig.photos.length} of ${maxPhotos})`} />
      <PhotoGrid
        photos={gig.photos}
        name={gig.title}
        room={removed ? null : gig.photos.length < maxPhotos}
        busy={busy === 'photo'}
        cover
        onAdd={() => void addPhoto()}
        onRemove={setDropping}
      />
      <Text style={styles.small}>The first photo is the cover customers see in the list.</Text>

      <Section title="Packages" />
      {sortedPackages(gig.packages).map((p) => (
        <View key={p.tier} style={styles.pack}>
          <View style={styles.flex}>
            <Text style={styles.strong}>{p.name}</Text>
            <Text style={styles.small}>{deliveryLine(p)}</Text>
          </View>
          <Text style={styles.price}>{money(p.price)}</Text>
        </View>
      ))}
      {gig.questions.length ? <Text style={styles.small}>{`${gig.questions.length} question${gig.questions.length === 1 ? '' : 's'} for customers`}</Text> : null}

      <View style={styles.links}>
        {removed ? null : <TextLink label="Edit gig" onPress={() => router.push({ pathname: '/(customer)/freelance/gigs/[id]/edit', params: { id: gig.id } })} />}
        {gig.status === 'live' ? <TextLink label="See it as customers do" onPress={() => router.push({ pathname: '/(customer)/gigs/[id]', params: { id: gig.id } })} /> : null}
      </View>

      {failure ? <ErrorBanner message={failure} /> : null}
      {gig.orders === 0 && !removed ? <TextLink muted label="Delete this gig" onPress={() => setDeleting(true)} /> : null}

      <ConfirmSheet
        visible={deleting}
        title="Delete this gig?"
        message={`${gig.title} will be deleted. This can’t be undone.`}
        confirmLabel="Delete"
        loading={busy === 'delete'}
        onConfirm={() => void remove()}
        onCancel={() => setDeleting(false)}
      />
      <ConfirmSheet
        visible={!!dropping}
        title="Remove this photo?"
        message="Customers won’t see it any more."
        confirmLabel="Remove"
        onConfirm={() => void dropPhoto()}
        onCancel={() => setDropping(null)}
      />
    </ScreenContainer>
  );
}

/** One of your gigs: photos, packages, publishing and pausing, editing and deleting. */
export function ManageGigScreen() {
  const token = useAuthToken();
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const { data, loading, error, reload, setData } = useAsyncResource(() => FreelanceService.gig(token, id), id);
  useRefetchOnFocus(useCallback(() => reload(), [reload]));
  return data ? (
    <Dashboard gig={data} setGig={setData} reload={reload} fresh={fresh === '1'} />
  ) : (
    <ScreenContainer title="Gig">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={5}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  flex: { flex: 1, gap: 2 },
  title: { ...Typography.title, color: Brand.text },
  strong: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
  price: { ...Typography.bodyStrong, fontSize: 15, color: Brand.primarySoft },
  note: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  noteText: { ...Typography.caption, fontSize: 14, color: Brand.text },
  noteStrong: { ...Typography.bodyStrong, fontSize: 14, color: Brand.text },
  pack: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four },
});
