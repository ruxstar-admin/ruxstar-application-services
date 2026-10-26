import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

interface ComposerProps {
  onSend: (text: string) => void;
  /** False in broadcast communities: shows a notice instead of an input. */
  canPost: boolean;
}

const MAX_LENGTH = 1000;

/** Message input pinned above the keyboard; replaced by a notice where the viewer may not post. */
export function Composer({ onSend, canPost }: ComposerProps) {
  const [draft, setDraft] = useState('');
  const ready = draft.trim().length > 0;

  if (!canPost) {
    return (
      <View style={styles.bar}>
        <Text style={styles.notice}>Only community admins can post here.</Text>
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
