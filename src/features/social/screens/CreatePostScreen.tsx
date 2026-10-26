import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useFeedStore } from '@/features/social/stores/feed-store';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useDelayedFocus } from '@/hooks/use-delayed-focus';
import { Feedback } from '@/lib/haptics';
import { SocialService } from '@/services/social-service';

const MAX_LENGTH = 500;
const MAX_IMAGES = 4;

/** Create a post (text + up to four photos), or edit the text of your own post when opened with an `id`. */
export function CreatePostScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const markFeedDirty = useFeedStore((s) => s.markDirty);
  const { id, text: initialText } = useLocalSearchParams<{ id?: string; text?: string }>();
  const editing = !!id;
  const inputRef = useDelayedFocus<TextInput>();

  const [text, setText] = useState(initialText ?? '');
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const canSubmit = text.trim().length > 0 || images.length > 0;

  const addPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.7,
    });
    if (result.canceled) return;
    Feedback.select();
    setImages((prev) => [...prev, ...result.assets.map((asset) => asset.uri)].slice(0, MAX_IMAGES));
  };

  const submit = async () => {
    setSaving(true);
    setFailed(false);
    try {
      if (editing) await SocialService.updatePost(token, id, text.trim());
      else await SocialService.createPost(token, text.trim(), images);
      Feedback.success();
      markFeedDirty();
      router.back();
    } catch {
      Feedback.error();
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer
      title={editing ? 'Edit post' : 'New post'}
      footer={<PrimaryButton label={editing ? 'Save' : 'Post'} onPress={submit} disabled={!canSubmit} loading={saving} />}
    >
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={text}
        onChangeText={(value) => {
          setText(value);
          setFailed(false);
        }}
        placeholder="What is happening?"
        placeholderTextColor={Brand.textFaint}
        multiline
        maxLength={MAX_LENGTH}
        accessibilityLabel="Post text"
      />
      <Text style={styles.count}>{`${text.length}/${MAX_LENGTH}`}</Text>

      {!editing ? (
        <>
          <View style={styles.thumbs}>
            {images.map((uri) => (
              <View key={uri} style={styles.thumbWrap}>
                <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                  style={styles.remove}
                  onPress={() => setImages((prev) => prev.filter((u) => u !== uri))}
                >
                  <Ionicons name="close" size={14} color={Brand.text} />
                </Pressable>
              </View>
            ))}
          </View>
          {images.length < MAX_IMAGES ? <TextLink label={images.length === 0 ? 'Add photos' : 'Add more photos'} onPress={addPhotos} /> : null}
        </>
      ) : null}

      {failed ? <ErrorBanner message="Could not post. Please try again." onRetry={submit} /> : null}
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
  count: { ...Typography.caption, color: Brand.textFaint, alignSelf: 'flex-end' },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  thumbWrap: { width: 84, height: 84 },
  thumb: { width: 84, height: 84, borderRadius: Radius.sm },
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
});
