import { useState, type Dispatch, type SetStateAction } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { fileSize } from '@/features/coaching/lib/materials';
import { errorText } from '@/features/events/lib/messages';
import { useAuthToken } from '@/hooks/use-auth-token';
import { keepIdempotencyKey, newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { GigsService } from '@/services/gigs-service';
import type { FileUse } from '@/types/gigs';
import { useGigLimits } from '../hooks/use-gigs';
import { filesProblem } from '../lib/files';

/** A file being sent with an order or a delivery: uploading while `id` is null, until it fails or arrives. */
export interface HeldFile {
  key: string;
  /** Kept across a retry after a lost connection, so the file is stored once. */
  uploadKey: string;
  uri: string;
  name: string;
  bytes: number;
  id: string | null;
  failed: boolean;
}

export const filesReady = (files: readonly HeldFile[]) => files.every((f) => f.id);
export const fileIdsOf = (files: readonly HeldFile[]) => files.flatMap((f) => (f.id ? [f.id] : []));

/** Pick files, each uploaded straight away; tap one that failed to try again, or the cross to drop it. */
export function FilesField({
  use,
  maxMb,
  files,
  setFiles,
  label,
}: {
  use: FileUse;
  maxMb: number;
  files: HeldFile[];
  setFiles: Dispatch<SetStateAction<HeldFile[]>>;
  label: string;
}) {
  const token = useAuthToken();
  const limits = useGigLimits();
  const [problem, setProblem] = useState<string | null>(null);

  const upload = async (file: HeldFile) => {
    const update = (patch: Partial<HeldFile>) => setFiles((prev) => prev.map((f) => (f.key === file.key ? { ...f, ...patch } : f)));
    update({ failed: false });
    try {
      const saved = await GigsService.upload(token, { uri: file.uri, name: file.name }, use, { idempotencyKey: file.uploadKey });
      update({ id: saved.id, bytes: saved.bytes });
    } catch (err) {
      Feedback.error();
      setProblem(errorText(err));
      update({ failed: true, uploadKey: keepIdempotencyKey(err) ? file.uploadKey : newIdempotencyKey() });
    }
  };

  const pick = async () => {
    setProblem(null);
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: true });
    if (result.canceled || !result.assets.length) return;
    const wrong = filesProblem(result.assets, files, maxMb, limits);
    if (wrong) {
      Feedback.error();
      setProblem(wrong);
      return;
    }
    const added = result.assets.map((a) => ({ key: newIdempotencyKey(), uploadKey: newIdempotencyKey(), uri: a.uri, name: a.name, bytes: a.size ?? 0, id: null, failed: false }));
    setFiles((prev) => [...prev, ...added]);
    for (const file of added) await upload(file);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {files.map((f) => (
        <Pressable
          key={f.key}
          accessibilityRole="button"
          accessibilityLabel={f.failed ? `${f.name}, not sent. Try again` : f.name}
          disabled={!f.failed}
          onPress={() => void upload(f)}
          style={styles.file}
        >
          <Ionicons name={f.failed ? 'alert-circle-outline' : 'document-outline'} size={20} color={f.failed ? Brand.error : Brand.primarySoft} />
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>
              {f.name}
            </Text>
            <Text style={[styles.meta, f.failed && styles.failed]}>{f.failed ? 'Not sent · tap to try again' : f.id ? fileSize(f.bytes) : 'Sending…'}</Text>
          </View>
          {!f.id && !f.failed ? <ActivityIndicator color={Brand.primarySoft} size="small" /> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${f.name}`} hitSlop={10} onPress={() => setFiles((prev) => prev.filter((x) => x.key !== f.key))}>
            <Ionicons name="close" size={20} color={Brand.textMuted} />
          </Pressable>
        </Pressable>
      ))}
      {problem ? <Text style={styles.problem}>{problem}</Text> : null}
      {files.length < limits.files ? <TextLink label={files.length ? 'Add more files' : 'Add files'} onPress={() => void pick()} /> : null}
      <Text style={styles.meta}>{`Up to ${limits.files} files and ${maxMb} MB in all.`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  label: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  file: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.two, borderRadius: Radius.md, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  flex: { flex: 1, gap: 2 },
  name: { ...Typography.body, fontSize: 15, color: Brand.text },
  meta: { ...Typography.caption, color: Brand.textMuted },
  failed: { color: Brand.error },
  problem: { ...Typography.caption, color: Brand.error },
});
