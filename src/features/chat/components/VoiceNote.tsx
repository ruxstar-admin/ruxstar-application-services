import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, type AudioPlayer } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { clockOf } from '@/features/chat/lib/thread-layout';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';

interface VoiceNoteProps {
  uri: string;
  durationMs: number;
  levels: number[];
  mine: boolean;
}

const BARS = 28;
const BAR_WIDTH = 3;
const BAR_GAP = 2;
const BAR_MAX = 26;

/** Only one voice message plays at a time: starting one pauses the last. */
let playing: AudioPlayer | null = null;

/** The waveform as BARS bars, from the recording's loudness, or a gentle placeholder when it has none. */
export function waveform(levels: number[], bars = BARS): number[] {
  if (levels.length === 0) return Array.from({ length: bars }, (_, i) => 30 + 20 * Math.sin(i * 0.9));
  return Array.from({ length: bars }, (_, i) => {
    const from = Math.floor((i * levels.length) / bars);
    const to = Math.max(from + 1, Math.floor(((i + 1) * levels.length) / bars));
    const slice = levels.slice(from, to);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

/** A voice message: play or pause, its waveform filling as it plays, and the time left. */
export function VoiceNote({ uri, durationMs, levels, mine }: VoiceNoteProps) {
  const player = useAudioPlayer(uri, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const total = status.duration > 0 ? status.duration * 1000 : durationMs;
  const progress = total > 0 ? Math.min(1, (status.currentTime * 1000) / total) : 0;
  const bars = waveform(levels);

  useEffect(() => {
    if (!status.didJustFinish) return;
    player.pause();
    player.seekTo(0).catch(() => undefined);
  }, [status.didJustFinish, player]);

  useEffect(
    () => () => {
      if (playing === player) playing = null;
    },
    [player],
  );

  const toggle = async () => {
    if (status.playing) return player.pause();
    if (playing && playing !== player) playing.pause();
    playing = player;
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => undefined);
    player.play();
  };

  const faint = mine ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.3)';
  const left = status.playing || status.currentTime > 0 ? total - status.currentTime * 1000 : total;

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause voice message' : `Play voice message, ${clockOf(total)}`}
        hitSlop={8}
        onPress={toggle}
        style={({ pressed }) => [styles.play, pressed && styles.pressed]}
      >
        <Ionicons name={status.playing ? 'pause' : 'play'} size={18} color={Brand.onAction} />
      </Pressable>
      <View style={styles.bars} accessible={false}>
        {bars.map((level, i) => (
          <View
            key={i}
            style={[styles.bar, { height: Math.max(4, (level / 100) * BAR_MAX), backgroundColor: (i + 0.5) / bars.length <= progress ? Brand.text : faint }]}
          />
        ))}
      </View>
      <Text style={styles.time}>{clockOf(left)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 2 },
  play: { width: 32, height: 32, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.action },
  pressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
  bars: { flexDirection: 'row', alignItems: 'center', gap: BAR_GAP, height: BAR_MAX, width: BARS * (BAR_WIDTH + BAR_GAP) - BAR_GAP },
  bar: { width: BAR_WIDTH, borderRadius: BAR_WIDTH },
  time: { ...Typography.caption, fontSize: 12, color: Brand.text, fontVariant: ['tabular-nums'], minWidth: 32 },
});
