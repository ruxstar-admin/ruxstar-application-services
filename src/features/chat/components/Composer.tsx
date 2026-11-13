import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Motion } from '@/constants/motion';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

interface ComposerProps {
  onSend: (text: string) => void;
  onPhoto: () => void;
  onCamera: () => void;
  /** Shown instead of the input when you can't send, e.g. while a request waits. */
  notice?: string | null;
}

const MAX_LENGTH = 1000;

/** Message input pinned above the keyboard: camera on the left, gallery while empty, send once you type. */
export function Composer({ onSend, onPhoto, onCamera, notice }: ComposerProps) {
  const [draft, setDraft] = useState('');
  const ready = draft.trim().length > 0;

  if (notice) {
    return (
      <View style={styles.bar}>
        <Text style={styles.notice}>{notice}</Text>
      </View>
    );
  }

  const send = () => {
    if (!ready) return;
    Feedback.tap();
    onSend(draft.trim());
    setDraft('');
  };

  return (
    <View style={styles.bar}>
      <View style={styles.field}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take a photo"
          hitSlop={6}
          onPress={onCamera}
          style={({ pressed }) => [styles.camera, pressed && styles.pressed]}
        >
          <Ionicons name="camera" size={18} color={Brand.text} />
        </Pressable>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Message…"
          placeholderTextColor={Brand.textFaint}
          maxLength={MAX_LENGTH}
          multiline
          accessibilityLabel="Message"
        />
        {ready ? (
          <Animated.View key="send" entering={ZoomIn.duration(Motion.duration.fast)} exiting={ZoomOut.duration(Motion.duration.fast)}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              hitSlop={8}
              onPress={send}
              style={({ pressed }) => [styles.send, pressed && styles.pressed]}
            >
              <Ionicons name="arrow-up" size={20} color={Brand.onAction} />
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View key="photo" entering={ZoomIn.duration(Motion.duration.fast)}>
            <Pressable accessibilityRole="button" accessibilityLabel="Send a photo from your gallery" hitSlop={8} onPress={onPhoto} style={styles.icon}>
              <Ionicons name="image-outline" size={22} color={Brand.text} />
            </Pressable>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const SIDE = 36;

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: Brand.bg,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    minHeight: SIDE + Spacing.two * 2,
    padding: Spacing.one + 2,
    borderRadius: Radius.xl,
    backgroundColor: Brand.surfaceAlt,
  },
  camera: { width: SIDE, height: SIDE, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.primaryDeep },
  icon: { width: SIDE, height: SIDE, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    ...Typography.body,
    color: Brand.text,
    minHeight: SIDE,
    maxHeight: 120,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  send: { width: SIDE, height: SIDE, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.action },
  pressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
  notice: { ...Typography.caption, textAlign: 'center', color: Brand.textMuted, paddingVertical: Spacing.two },
});
