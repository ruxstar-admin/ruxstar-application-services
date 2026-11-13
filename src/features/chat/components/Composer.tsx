import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

interface ComposerProps {
  onSend: (text: string) => void;
  onPhoto: () => void;
  /** Shown instead of the input when you can't send, e.g. while a request waits. */
  notice?: string | null;
}

const MAX_LENGTH = 1000;

/** Message input pinned above the keyboard, with a photo button; replaced by a notice when you can't send. */
export function Composer({ onSend, onPhoto, notice }: ComposerProps) {
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
      <Pressable accessibilityRole="button" accessibilityLabel="Send a photo" hitSlop={8} onPress={onPhoto} style={styles.icon}>
        <Ionicons name="image-outline" size={22} color={Brand.textMuted} />
      </Pressable>
      <TextInput
        style={styles.input}
        value={draft}
        onChangeText={setDraft}
        placeholder="Message"
        placeholderTextColor={Brand.textFaint}
        maxLength={MAX_LENGTH}
        multiline
        accessibilityLabel="Message"
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={!ready} hitSlop={8} onPress={send} style={[styles.send, ready && styles.sendReady]}>
        <Ionicons name="arrow-up" size={20} color={ready ? Brand.onAction : Brand.textFaint} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  icon: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    ...Typography.body,
    color: Brand.text,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two + 2,
    paddingBottom: Spacing.two + 2,
    borderRadius: Radius.lg,
    backgroundColor: Brand.surfaceAlt,
  },
  send: { width: 44, height: 44, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.surfaceAlt },
  sendReady: { backgroundColor: Brand.action },
  notice: { ...Typography.caption, flex: 1, textAlign: 'center', color: Brand.textMuted, paddingVertical: Spacing.two },
});
