import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { toUploadJpeg } from '@/features/profile/lib/profile-photo';
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

/** A photo starts uploading as soon as it is picked, so Post is quick. */
interface Draft {
  uri: string;
  status: 'uploading' | 'ready' | 'failed';
  id?: string;
  asset: ImagePicker.ImagePickerAsset;
}

/**
 * Create a post (text and up to four photos), or edit the text of your own post when opened with an `id`.
 * `kind=business` posts to the Business tab; the vendor portal opens it that way.
 */
export function CreatePostScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const markFeedDirty = useFeedStore((s) => s.markDirty);
  const {
    id,
    text: initialText,
    kind: kindParam,
    businessId: businessParam,
  } = useLocalSearchParams<{ id?: string; text?: string; kind?: PostKind; businessId?: string }>();
  const editing = !!id;
  const kind: PostKind = kindParam === 'business' ? 'business' : 'personal';
  const inputRef = useDelayedFocus<TextInput>();

  const [text, setText] = useState(initialText ?? '');
  const businesses = useAsyncResource(() => (kind === 'business' && !editing ? BusinessService.list(token) : Promise.resolve([])));
  const [picked, setPicked] = useState<string | null>(businessParam ?? null);
  const businessId = picked ?? businesses.data?.[0]?.id;
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const uploading = drafts.some((d) => d.status === 'uploading');
  const broken = drafts.some((d) => d.status === 'failed');
  const canSubmit = (text.trim().length > 0 || drafts.length > 0) && !uploading && !broken;

  const update = (uri: string, changes: Partial<Draft>) => setDrafts((prev) => prev.map((d) => (d.uri === uri ? { ...d, ...changes } : d)));

  const upload = async (draft: Draft) => {
    update(draft.uri, { status: 'uploading' });
    try {
      const photo = await SocialService.uploadPhoto(token, await toUploadJpeg(draft.asset, UPLOAD_SIDE));
      update(draft.uri, { status: 'ready', id: photo.id });
    } catch {
      update(draft.uri, { status: 'failed' });
    }
  };

  const addPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - drafts.length,
      quality: 1,
    });
    if (result.canceled) return;
    Feedback.select();
    const known = new Set(drafts.map((d) => d.uri));
    const added = result.assets
      .filter((asset) => !known.has(asset.uri))
      .slice(0, MAX_IMAGES - drafts.length)
      .map((asset): Draft => ({ uri: asset.uri, asset, status: 'uploading' }));
    setDrafts((prev) => [...prev, ...added]);
    added.forEach(upload);
  };

  const submit = async () => {
    setSaving(true);
    setFailure(null);
    try {
      if (editing) await SocialService.updatePost(token, id, text.trim());
      else {
        await SocialService.createPost(token, {
          text: text.trim(),
          mediaIds: drafts.map((d) => d.id!),
          kind,
          ...(kind === 'business' && businessId ? { businessId } : {}),
        });
      }
      Feedback.success();
      markFeedDirty();
      router.back();
    } catch (err) {
      Feedback.error();
      setFailure(err instanceof ApiError && err.status === 403 ? 'Only vendors can post to a business page.' : 'Could not post. Please try again.');
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
      {kind === 'business' && !editing ? <Badge label="Shows on your Business tab" tone="accent" /> : null}
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
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={text}
        onChangeText={(value) => {
          setText(value);
          setFailure(null);
        }}
        placeholder={kind === 'business' ? 'Share an offer, new stock or an update' : 'What is happening?'}
        placeholderTextColor={Brand.textFaint}
        multiline
        maxLength={MAX_LENGTH}
        accessibilityLabel="Post text"
      />
      <Text style={[styles.count, text.length > MAX_LENGTH - 50 && styles.countNear]}>{`${text.length}/${MAX_LENGTH}`}</Text>

      {!editing ? (
        <>
          <Animated.View layout={LinearTransition.springify().damping(18)} style={styles.thumbs}>
            {drafts.map((draft) => (
              <Animated.View key={draft.uri} entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={styles.thumbWrap}>
                <Image source={{ uri: draft.uri }} style={styles.thumb} contentFit="cover" />
                {draft.status !== 'ready' ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={draft.status === 'failed' ? 'Upload failed. Tap to retry.' : 'Uploading'}
                    disabled={draft.status === 'uploading'}
                    onPress={() => upload(draft)}
                    style={styles.overlay}
                  >
                    {draft.status === 'uploading' ? <ActivityIndicator color={Brand.text} /> : <Ionicons name="refresh" size={22} color={Brand.text} />}
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                  hitSlop={11}
                  style={styles.remove}
                  onPress={() => {
                    Feedback.tap();
                    setDrafts((prev) => prev.filter((d) => d.uri !== draft.uri));
                  }}
                >
                  <Ionicons name="close" size={14} color={Brand.text} />
                </Pressable>
              </Animated.View>
            ))}
          </Animated.View>
          {broken ? <Text style={styles.hint}>A photo did not upload. Tap it to try again, or remove it.</Text> : null}
          {drafts.length < MAX_IMAGES ? (
            <TextLink label={drafts.length === 0 ? 'Add photos' : `Add more photos (${MAX_IMAGES - drafts.length} left)`} onPress={addPhotos} />
          ) : null}
        </>
      ) : null}

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
  count: { ...Typography.caption, color: Brand.textFaint, alignSelf: 'flex-end', fontVariant: ['tabular-nums'] },
  countNear: { color: Brand.warning },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  thumbWrap: { width: 84, height: 84 },
  thumb: { width: 84, height: 84, borderRadius: Radius.sm },
  overlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
