import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, ZoomIn, ZoomOut, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Motion } from '@/constants/motion';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import type { Recording } from '@/features/chat/hooks/use-thread';
import { useVoiceRecorder } from '@/features/chat/hooks/use-voice-recorder';
import { clockOf, quoteOf } from '@/features/chat/lib/thread-layout';
import { Feedback } from '@/lib/haptics';
import type { PendingMessage } from '@/types/chat';

interface ComposerProps {
  onSend: (text: string) => void;
  onPhoto: () => void;
  onCamera: () => void;
  onVoice: (recording: Recording) => void;
  /** Every change to the draft, so the others can see you typing. */
  onTyping: (draft: string) => void;
  replyingTo: PendingMessage | null;
  onCancelReply: () => void;
  /** Shown instead of the input when you can't send, e.g. while a request waits. */
  notice?: string | null;
}

const MAX_LENGTH = 1000;
const SIDE = 36;

function RecordingDot() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.25, { duration: 600 }), -1, true);
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.dot, style]} />;
}

/**
 * Message input pinned above the keyboard: camera on the left; mic and gallery while empty, send once you
 * type. Tapping the mic records a voice message, with a timer and live waveform, to send or throw away.
 */
export function Composer({ onSend, onPhoto, onCamera, onVoice, onTyping, replyingTo, onCancelReply, notice }: ComposerProps) {
  const [draft, setDraft] = useState('');
  const voice = useVoiceRecorder(onVoice);
  const ready = draft.trim().length > 0;

  if (notice) {
    return (
      <View style={styles.bar}>
        <Text style={styles.notice}>{notice}</Text>
      </View>
    );
  }

  const change = (text: string) => {
    setDraft(text);
    onTyping(text);
  };

  const send = () => {
    if (!ready) return;
    Feedback.tap();
    onSend(draft.trim());
    setDraft('');
  };

  const record = async () => {
    Feedback.press();
    await voice.start();
  };

  const finishVoice = async () => {
    const done = await voice.stop();
    if (!done) return Feedback.error();
    Feedback.success();
    onVoice(done);
  };

  const quote = replyingTo ? quoteOf(replyingTo) : null;

  return (
    <View style={styles.bar}>
      {quote ? (
        <Animated.View entering={FadeInDown.duration(Motion.duration.fast)} exiting={FadeOut.duration(Motion.duration.fast)} style={styles.reply}>
          <View style={styles.replyText}>
            <Text style={styles.replyLabel} numberOfLines={1}>
              {quote.mine ? 'Replying to yourself' : `Replying to ${quote.sender}`}
            </Text>
            <Text style={styles.replyQuote} numberOfLines={1}>
              {quote.text}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel reply" hitSlop={10} onPress={onCancelReply}>
            <Ionicons name="close" size={20} color={Brand.textMuted} />
          </Pressable>
        </Animated.View>
      ) : null}

      {voice.denied ? <Text style={styles.denied}>Microphone access is off for Ruxstar. Turn it on in your phone settings to send voice messages.</Text> : null}

      {voice.recording ? (
        <Animated.View entering={FadeIn.duration(Motion.duration.fast)} style={[styles.field, styles.recordingField]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Delete recording" hitSlop={6} onPress={voice.cancel} style={styles.icon}>
            <Ionicons name="trash-outline" size={22} color={Brand.text} />
          </Pressable>
          <RecordingDot />
          <Text style={styles.timer} accessibilityLiveRegion="polite">
            {clockOf(voice.durationMs)}
          </Text>
          <View style={styles.live}>
            {voice.live.map((level, i) => (
              <View key={i} style={[styles.liveBar, { height: Math.max(3, (level / 100) * 24) }]} />
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send voice message"
            hitSlop={8}
            onPress={finishVoice}
            style={({ pressed }) => [styles.send, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-up" size={20} color={Brand.onAction} />
          </Pressable>
        </Animated.View>
      ) : (
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
            onChangeText={change}
            placeholder="Message…"
            placeholderTextColor={Brand.textFaint}
            maxLength={MAX_LENGTH}
            multiline
            accessibilityLabel="Message"
          />
          {ready ? (
            <Animated.View key="send" entering={ZoomIn.duration(Motion.duration.fast)} exiting={ZoomOut.duration(Motion.duration.fast)}>
              <Pressable accessibilityRole="button" accessibilityLabel="Send message" hitSlop={8} onPress={send} style={({ pressed }) => [styles.send, pressed && styles.pressed]}>
                <Ionicons name="arrow-up" size={20} color={Brand.onAction} />
              </Pressable>
            </Animated.View>
          ) : (
            <Animated.View key="tools" entering={ZoomIn.duration(Motion.duration.fast)} style={styles.tools}>
              <Pressable accessibilityRole="button" accessibilityLabel="Record a voice message" hitSlop={6} onPress={record} style={styles.icon}>
                <Ionicons name="mic-outline" size={23} color={Brand.text} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Send a photo from your gallery" hitSlop={6} onPress={onPhoto} style={styles.icon}>
                <Ionicons name="image-outline" size={22} color={Brand.text} />
              </Pressable>
            </Animated.View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: Brand.bg,
  },
  reply: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.one,
  },
  replyText: { flex: 1, gap: 2 },
  replyLabel: { ...Typography.caption, color: Brand.text, fontFamily: Typography.bodyStrong.fontFamily },
  replyQuote: { ...Typography.caption, color: Brand.textMuted },
  denied: { ...Typography.caption, color: Brand.textMuted, textAlign: 'center', paddingHorizontal: Spacing.three },
  field: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    minHeight: SIDE + Spacing.two * 2,
    padding: Spacing.one + 2,
    borderRadius: Radius.xl,
    backgroundColor: Brand.surfaceAlt,
  },
  recordingField: { alignItems: 'center' },
  camera: { width: SIDE, height: SIDE, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.primaryDeep },
  icon: { width: SIDE, height: SIDE, alignItems: 'center', justifyContent: 'center' },
  tools: { flexDirection: 'row' },
  input: {
    flex: 1,
    ...Typography.body,
    color: Brand.text,
    minHeight: SIDE,
    maxHeight: 120,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Brand.error },
  timer: { ...Typography.bodyStrong, color: Brand.text, fontVariant: ['tabular-nums'], minWidth: 40 },
  live: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2, height: 26, overflow: 'hidden' },
  liveBar: { width: 3, borderRadius: 2, backgroundColor: Brand.primarySoft },
  send: { width: SIDE, height: SIDE, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.action },
  pressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
  notice: { ...Typography.caption, textAlign: 'center', color: Brand.textMuted, paddingVertical: Spacing.two },
});
