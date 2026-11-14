import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { toUploadJpeg } from '@/features/profile/lib/profile-photo';
import { PhotoStrip, StripTile } from '@/features/social/components/PhotoStrip';
import { useFeedStore } from '@/features/social/stores/feed-store';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useDelayedFocus } from '@/hooks/use-delayed-focus';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { BusinessService } from '@/services/business-service';
import { SocialService } from '@/services/social-service';
import type { PostKind } from '@/types/social';

const MAX_LENGTH = 500;
const MAX_IMAGES = 4;
/** The API keeps the long side at 1440 px, so sending more is wasted upload time. */
const UPLOAD_SIDE = 1440;

const SHAPES = [
  { key: 'original', label: 'Original' },
  { key: 'square', label: 'Square' },
  { key: 'portrait', label: 'Portrait' },
] as const;
type Shape = (typeof SHAPES)[number]['key'];
/** Width / height each shape cuts to. Original sends the photo as it is; the API holds it between 4:5 and 1.91:1. */
const SHAPE_RATIO: Record<Shape, number | undefined> = { original: undefined, square: 1, portrait: 0.8 };

/** A photo starts uploading as soon as it is picked, so Post is quick. `job` tells a stale upload from the latest one. */
interface Draft {
  uri: string;
  status: 'uploading' | 'ready' | 'failed';
  id?: string;
  job: number;
  asset: ImagePicker.ImagePickerAsset;
}

const ratioOf = (asset: ImagePicker.ImagePickerAsset) =>
  asset.width > 0 && asset.height > 0 ? Math.min(1.91, Math.max(0.8, asset.width / asset.height)) : 1;

/**
 * Create a post (up to four photos and a caption), or edit the text of your own post when opened with an `id`.
 * Photos come first: pick or take them, choose their shape, drag them into order, then write.
 * `kind=business` posts to the Business tab; the vendor portal opens it that way.
 */
export function CreatePostScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const addPost = useFeedStore((s) => s.addPost);
  const editPost = useFeedStore((s) => s.editPost);
  const {
    id,
    text: initialText,
    kind: kindParam,
    businessId: businessParam,
    teamOf,
  } = useLocalSearchParams<{ id?: string; text?: string; kind?: PostKind; businessId?: string; teamOf?: string }>();
  const editing = !!id;
  const kind: PostKind = kindParam === 'business' ? 'business' : 'personal';
  // From Work, `teamOf` names the business someone posts for; it goes out as the owner's.
  const forTeam = kind === 'business' && !!teamOf && !!businessParam;
  // A new post starts with photos, so only editing opens the keyboard.
  const inputRef = useDelayedFocus<TextInput>(undefined, editing);

  const [text, setText] = useState(initialText ?? '');
  const businesses = useAsyncResource(() => (kind === 'business' && !editing && !forTeam ? BusinessService.list(token) : Promise.resolve([])));
  const [picked, setPicked] = useState<string | null>(businessParam ?? null);
  const businessId = picked ?? businesses.data?.[0]?.id;
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [shape, setShape] = useState<Shape>('original');
  const [selected, setSelected] = useState<string | null>(null);
  const [previewWidth, setPreviewWidth] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const jobs = useRef(0);

  const uploading = drafts.some((d) => d.status === 'uploading');
  const broken = drafts.some((d) => d.status === 'failed');
  const canSubmit = (text.trim().length > 0 || drafts.length > 0) && !uploading && !broken;
  const shown = drafts.find((d) => d.uri === selected) ?? drafts[0];
  const frame = drafts.length > 0 ? (SHAPE_RATIO[shape] ?? ratioOf(drafts[0].asset)) : 1;

  const upload = async (draft: Draft, cut: Shape = shape) => {
    const job = ++jobs.current;
    const settle = (changes: Partial<Draft>) =>
      setDrafts((prev) => prev.map((d) => (d.uri === draft.uri && d.job === job ? { ...d, ...changes } : d)));
    setDrafts((prev) => prev.map((d) => (d.uri === draft.uri ? { ...d, job, status: 'uploading', id: undefined } : d)));
    try {
      const photo = await SocialService.uploadPhoto(token, await toUploadJpeg(draft.asset, UPLOAD_SIDE, SHAPE_RATIO[cut]));
      settle({ status: 'ready', id: photo.id });
    } catch {
      settle({ status: 'failed' });
    }
  };

  const add = (assets: ImagePicker.ImagePickerAsset[]) => {
    const known = new Set(drafts.map((d) => d.uri));
    const added = assets
      .filter((asset) => !known.has(asset.uri))
      .slice(0, MAX_IMAGES - drafts.length)
      .map((asset): Draft => ({ uri: asset.uri, asset, status: 'uploading', job: 0 }));
    if (added.length === 0) return;
    Feedback.select();
    setDrafts((prev) => [...prev, ...added]);
    setSelected(added[0].uri);
    added.forEach((d) => upload(d));
  };

  const fromLibrary = async () => {
    setNotice(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - drafts.length,
      orderedSelection: true,
      quality: 1,
    });
    if (!result.canceled) add(result.assets);
  };

  const fromCamera = async () => {
    setNotice(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setNotice('Camera access is off for Ruxstar. Turn it on in your phone settings to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled) add(result.assets);
  };

  const changeShape = (next: Shape) => {
    if (next === shape) return;
    Feedback.select();
    setShape(next);
    drafts.forEach((d) => upload(d, next));
  };

  const move = (from: number, to: number) => {
    Feedback.select();
    setDrafts((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      if (moved) next.splice(to, 0, moved);
      return next;
    });
  };

  const remove = (uri: string) => setDrafts((prev) => prev.filter((d) => d.uri !== uri));

  const submit = async () => {
    setSaving(true);
    setFailure(null);
    try {
      if (editing) {
        const saved = await SocialService.updatePost(token, id, text.trim());
        editPost(saved.id, { text: saved.text, editedAt: saved.editedAt });
      } else {
        addPost(
          await SocialService.createPost(token, {
            text: text.trim(),
            mediaIds: drafts.map((d) => d.id!),
            kind,
            ...(kind === 'business' && businessId ? { businessId } : {}),
          }),
        );
      }
      Feedback.success();
      router.back();
    } catch (err) {
      Feedback.error();
      setFailure(
        forTeam && err instanceof ApiError && err.status >= 400 && err.status < 500
          ? err.message
          : err instanceof ApiError && err.status === 403
            ? 'Only vendors can post to a business page.'
            : 'Could not post. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const title = editing ? 'Edit post' : kind === 'business' ? 'New business post' : 'New post';

  return (
    <ScreenContainer
      title={title}
      footer={
        <PrimaryButton label={editing ? 'Save' : uploading ? 'Uploading photos…' : 'Post'} onPress={submit} disabled={!canSubmit} loading={saving} />
      }
    >
      {kind === 'business' && !editing ? (
        <Badge label={forTeam ? `Posts for ${teamOf}, under the owner’s name` : 'Shows on your Business tab'} tone="accent" />
      ) : null}
      {kind === 'business' && !editing && (businesses.data?.length ?? 0) > 1 ? (
        <View style={styles.picker}>
          <Text style={styles.pickerLabel}>Posting for</Text>
          <View style={styles.pills}>
            {businesses.data!.map((b) => {
              const on = b.id === businessId;
              return (
                <Pressable
                  key={b.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    Feedback.select();
                    setPicked(b.id);
                  }}
                  style={[styles.pill, on && styles.pillOn]}
                >
                  <Text style={[styles.pillText, on && styles.pillTextOn]} numberOfLines={1}>
                    {b.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      {!editing && drafts.length === 0 ? (
        <View style={styles.start}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Choose up to ${MAX_IMAGES} photos from your gallery`}
            onPress={fromLibrary}
            style={({ pressed }) => [styles.source, pressed && styles.sourcePressed]}
          >
            <Ionicons name="images-outline" size={30} color={Brand.text} />
            <Text style={styles.sourceLabel}>Gallery</Text>
            <Text style={styles.sourceNote}>{`Up to ${MAX_IMAGES} photos`}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take a photo"
            onPress={fromCamera}
            style={({ pressed }) => [styles.source, pressed && styles.sourcePressed]}
          >
            <Ionicons name="camera-outline" size={30} color={Brand.text} />
            <Text style={styles.sourceLabel}>Camera</Text>
            <Text style={styles.sourceNote}>Take one now</Text>
          </Pressable>
        </View>
      ) : null}

      {!editing && shown ? (
        <Animated.View entering={FadeIn.duration(180)} style={styles.photos}>
          <View style={[styles.preview, { aspectRatio: frame }]} onLayout={(e: LayoutChangeEvent) => setPreviewWidth(Math.floor(e.nativeEvent.layout.width))}>
            {previewWidth > 0 ? (
              <Image
                source={{ uri: shown.uri }}
                style={{ width: previewWidth, height: Math.round(previewWidth / frame) }}
                contentFit="cover"
                transition={120}
                accessibilityLabel="Selected photo"
              />
            ) : null}
            {shown.status !== 'ready' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={shown.status === 'failed' ? 'Upload failed. Tap to try again.' : 'Uploading'}
                disabled={shown.status === 'uploading'}
                onPress={() => upload(shown)}
                style={styles.overlay}
              >
                {shown.status === 'uploading' ? (
                  <ActivityIndicator color={Brand.text} />
                ) : (
                  <>
                    <Ionicons name="refresh" size={26} color={Brand.text} />
                    <Text style={styles.overlayText}>Tap to try again</Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>

          <SegmentedTabs options={SHAPES} value={shape} onChange={changeShape} />

          <PhotoStrip
            photos={drafts.map((d) => ({ key: d.uri, uri: d.uri, status: d.status }))}
            selected={shown.uri}
            onSelect={(uri) => {
              Feedback.select();
              setSelected(uri);
              const draft = drafts.find((d) => d.uri === uri);
              if (draft?.status === 'failed') upload(draft);
            }}
            onRemove={remove}
            onMove={move}
          >
            {drafts.length < MAX_IMAGES ? (
              <>
                <StripTile icon="add" label={`Add photos, ${MAX_IMAGES - drafts.length} left`} onPress={fromLibrary} />
                <StripTile icon="camera-outline" label="Take a photo" onPress={fromCamera} />
              </>
            ) : null}
          </PhotoStrip>
          {broken ? (
            <Text style={styles.hint}>A photo did not upload. Tap it to try again, or remove it.</Text>
          ) : drafts.length > 1 ? (
            <Text style={styles.note}>Hold a photo and drag it to change the order.</Text>
          ) : null}
        </Animated.View>
      ) : null}
      {notice ? <Text style={styles.hint}>{notice}</Text> : null}

      <TextInput
        ref={inputRef}
        style={[styles.input, drafts.length > 0 && styles.inputShort]}
        value={text}
        onChangeText={(value) => {
          setText(value);
          setFailure(null);
        }}
        placeholder={
          drafts.length > 0
            ? 'Write a caption'
            : kind === 'business'
              ? 'Share an offer, new stock or an update'
              : editing
                ? 'What is happening?'
                : 'Or just write something'
        }
        placeholderTextColor={Brand.textFaint}
        multiline
        maxLength={MAX_LENGTH}
        accessibilityLabel={drafts.length > 0 ? 'Caption' : 'Post text'}
      />
      <Text style={[styles.count, text.length > MAX_LENGTH - 50 && styles.countNear]}>{`${text.length}/${MAX_LENGTH}`}</Text>

      {failure ? <ErrorBanner message={failure} onRetry={submit} /> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  input: {
    ...Typography.body,
    color: Brand.text,
    minHeight: 140,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Brand.border,
    textAlignVertical: 'top',
  },
  inputShort: { minHeight: 96 },
  count: { ...Typography.caption, color: Brand.textFaint, alignSelf: 'flex-end', fontVariant: ['tabular-nums'] },
  countNear: { color: Brand.warning },
  start: { flexDirection: 'row', gap: Spacing.two },
  source: {
    flex: 1,
    height: 176,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    borderRadius: Radius.md,
    backgroundColor: Brand.surface,
  },
  sourcePressed: { backgroundColor: Brand.surfaceAlt, transform: [{ scale: 0.98 }] },
  sourceLabel: { ...Typography.bodyStrong, color: Brand.text, marginTop: Spacing.two },
  sourceNote: { ...Typography.caption, color: Brand.textMuted },
  photos: { gap: Spacing.three },
  preview: { width: '100%', overflow: 'hidden', borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  overlay: {
    ...StyleSheet.absoluteFill,
    gap: Spacing.two,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayText: { ...Typography.bodyStrong, color: Brand.text },
  note: { ...Typography.caption, color: Brand.textMuted },
  hint: { ...Typography.caption, color: Brand.error },
  picker: { gap: Spacing.two },
  pickerLabel: { ...Typography.caption, color: Brand.textMuted },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pill: {
    maxWidth: '100%',
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  pillOn: { backgroundColor: Brand.action, borderColor: Brand.action },
  pillText: { ...Typography.bodyStrong, color: Brand.text },
  pillTextOn: { color: Brand.onAction },
});
