import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { dayText } from '@/features/events/lib/events';
import { errorText } from '@/features/events/lib/messages';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { keepIdempotencyKey, newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { openLink } from '@/lib/open-link';
import { CoachingService, TeachService } from '@/services/coaching-service';
import type { DeskBatchDetail, Material } from '@/types/coaching';
import { fileSize } from '../lib/materials';

const FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_BYTES = 20 * 1024 * 1024;

type Adding = { kind: 'link' | 'file'; title: string; url: string; file: DocumentPicker.DocumentPickerAsset | null; wholeCourse: boolean };

function AddSheet({ batch, kind, onClose, onAdded }: { batch: DeskBatchDetail; kind: 'link' | 'file'; onClose: () => void; onAdded: (m: Material) => void }) {
  const token = useAuthToken();
  const [draft, setDraft] = useState<Adding>({ kind, title: '', url: 'https://', file: null, wholeCourse: false });
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const attempt = useRef(newIdempotencyKey());
  const errors = {
    ...(draft.title.trim().length < 2 ? { title: 'Name it, like “Chapter 3 notes”' } : {}),
    ...(kind === 'link' && !/^https?:\/\/\S+\.\S+/.test(draft.url.trim()) ? { url: 'A link starting https://' } : {}),
    ...(kind === 'file' && !draft.file ? { file: 'Pick a PDF or a photo' } : {}),
  };

  const pick = async () => {
    setFailure(null);
    const result = await DocumentPicker.getDocumentAsync({ type: FILE_TYPES, copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_FILE_BYTES) {
      setFailure('Files can be up to 20 MB. Compress it or split it and try again.');
      return;
    }
    setDraft((d) => ({ ...d, file: asset, title: d.title || asset.name.replace(/\.[^.]+$/, '').slice(0, 100) }));
  };

  const save = async () => {
    setShown(true);
    if (Object.keys(errors).length) {
      Feedback.error();
      return;
    }
    setBusy(true);
    setFailure(null);
    const wholeCourse = batch.role === 'owner' && draft.wholeCourse;
    try {
      const added =
        kind === 'link'
          ? await TeachService.addLink(token, batch.id, { title: draft.title.trim(), url: draft.url.trim(), wholeCourse }, { idempotencyKey: attempt.current })
          : await TeachService.addFile(token, batch.id, { uri: draft.file!.uri, mimeType: draft.file!.mimeType }, { title: draft.title.trim(), wholeCourse }, { idempotencyKey: attempt.current });
      Feedback.success();
      onAdded(added);
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
      if (!keepIdempotencyKey(err)) attempt.current = newIdempotencyKey();
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible onClose={onClose} title={kind === 'link' ? 'Share a link' : 'Upload a file'}>
      <View style={styles.sheet}>
        {kind === 'file' ? (
          <>
            <PrimaryButton label={draft.file ? `Change file · ${draft.file.name}` : 'Pick a PDF or photo'} variant="outline" onPress={pick} />
            {shown && errors.file ? <Text style={styles.error}>{errors.file}</Text> : null}
          </>
        ) : (
          <InputField label="Link" value={draft.url} onChangeText={(url) => setDraft((d) => ({ ...d, url }))} autoCapitalize="none" keyboardType="url" error={shown ? errors.url : undefined} />
        )}
        <InputField label="Title" value={draft.title} onChangeText={(title) => setDraft((d) => ({ ...d, title }))} maxLength={100} error={shown ? errors.title : undefined} />
        {batch.role === 'owner' ? (
          <ToggleRow title="For every batch of this course" subtitle="Otherwise only this batch sees it" value={draft.wholeCourse} onValueChange={(wholeCourse) => setDraft((d) => ({ ...d, wholeCourse }))} />
        ) : null}
        <Text style={styles.small}>Students and parents are told when you add something.</Text>
        {failure ? <ErrorBanner message={failure} /> : null}
        <PrimaryButton label={kind === 'link' ? 'Share link' : 'Upload'} loading={busy} onPress={save} />
      </View>
    </BottomSheet>
  );
}

function MaterialList({ items, canRemove, onOpen, onRemove, opening }: { items: Material[]; canRemove: boolean; onOpen: (m: Material) => void; onRemove: (m: Material) => void; opening: string | null }) {
  if (!items.length) return <EmptyState icon="folder-open-outline" title="Nothing shared yet" message="Notes, worksheets and links for this batch show up here." />;
  return (
    <View style={styles.list}>
      {items.map((m) => (
        <ListRow
          key={m.id}
          icon={m.kind === 'link' ? 'link-outline' : m.contentType === 'application/pdf' ? 'document-text-outline' : 'image-outline'}
          title={m.title}
          subtitle={[m.kind === 'file' && m.bytes ? fileSize(m.bytes) : 'Link', m.wholeCourse ? 'Every batch' : null, `Added ${dayText(m.addedAt)}`].filter(Boolean).join(' · ')}
          right={
            opening === m.id ? (
              <ActivityIndicator color={Brand.primarySoft} />
            ) : canRemove ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${m.title}`} hitSlop={10} onPress={() => onRemove(m)} style={styles.trash}>
                <Ionicons name="trash-outline" size={20} color={Brand.error} />
              </Pressable>
            ) : undefined
          }
          onPress={() => onOpen(m)}
        />
      ))}
    </View>
  );
}

/** Notes, files and links for a batch. Parents see their enrolment's; the owner and coaches with the permission add and remove them. */
export function MaterialsScreen({ source }: { source: 'order' | 'batch' }) {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = () => (source === 'order' ? CoachingService.materials(token, id) : TeachService.materials(token, id)).then((p) => p.items);
  const materials = useAsyncResource(load, `${source}:${id}`);
  const batch = useAsyncResource(() => (source === 'batch' ? TeachService.batch(token, id) : Promise.resolve(null)), `${source}:${id}`);
  const [adding, setAdding] = useState<'link' | 'file' | null>(null);
  const [removing, setRemoving] = useState<Material | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const desk = batch.data ?? null;
  const canAdd = !!desk?.can.materials;

  const open = async (m: Material) => {
    setFailure(null);
    if (m.kind === 'link') {
      if (!(await openLink(m.url))) setFailure('This link can’t be opened.');
      return;
    }
    setOpening(m.id);
    try {
      const fresh = (await load()).find((x) => x.id === m.id);
      await WebBrowser.openBrowserAsync(fresh?.url ?? m.url);
    } catch (err) {
      setFailure(errorText(err));
    } finally {
      setOpening(null);
    }
  };

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await TeachService.removeMaterial(token, removing.id);
      Feedback.success();
      materials.setData((now) => (now ?? []).filter((m) => m.id !== removing.id));
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
    } finally {
      setBusy(false);
      setRemoving(null);
    }
  };

  const footer = canAdd ? (
    <View style={styles.actions}>
      <View style={styles.action}>
        <PrimaryButton label="Upload file" onPress={() => setAdding('file')} />
      </View>
      <View style={styles.action}>
        <PrimaryButton label="Share link" variant="outline" onPress={() => setAdding('link')} />
      </View>
    </View>
  ) : null;

  return (
    <ScreenContainer title="Notes and files" footer={footer}>
      <AsyncBoundary loading={materials.loading} error={materials.error} hasData={!!materials.data} onRetry={materials.reload} skeletonRows={4}>
        <MaterialList items={materials.data ?? []} canRemove={canAdd} onOpen={open} onRemove={setRemoving} opening={opening} />
      </AsyncBoundary>
      {failure ? <ErrorBanner message={failure} /> : null}
      {adding && desk ? (
        <AddSheet
          batch={desk}
          kind={adding}
          onClose={() => setAdding(null)}
          onAdded={(m) => {
            materials.setData((now) => [m, ...(now ?? [])]);
            setAdding(null);
          }}
        />
      ) : null}
      <ConfirmSheet
        visible={!!removing}
        title="Remove this?"
        message={`“${removing?.title ?? ''}” is removed for everyone in the batch.`}
        confirmLabel="Remove"
        loading={busy}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, overflow: 'hidden' },
  sheet: { gap: Spacing.three },
  small: { ...Typography.caption, color: Brand.textMuted },
  trash: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  error: { ...Typography.caption, color: Brand.error },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
});
