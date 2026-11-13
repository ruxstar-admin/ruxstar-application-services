import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Badge } from '@/components/ui/Badge';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { PROBLEM_LABEL, PROBLEM_PHOTOS_MAX, resolutionLine } from '@/features/pod/lib/order';
import { timeAgo } from '@/lib/time';
import type { OrderProblem } from '@/types/order';

interface ProblemCardProps {
  problem: OrderProblem;
  /** The shop's words: its share is held, refunds come from it. */
  forShop?: boolean;
  /** Shown while the problem is open and has room for another photo. */
  onAddPhoto?: () => void;
  adding?: boolean;
}

/** A reported problem: what went wrong, the photos, and what Ruxstar decided. */
export function ProblemCard({ problem, forShop = false, onAddPhoto, adding }: ProblemCardProps) {
  const open = problem.status === 'open';
  const room = open && problem.photos.length < PROBLEM_PHOTOS_MAX;
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>{PROBLEM_LABEL[problem.kind]}</Text>
        <Badge label={open ? 'With Ruxstar' : 'Settled'} tone={open ? 'warning' : 'success'} />
      </View>
      <Text style={styles.muted}>{`Reported ${timeAgo(problem.reportedAt)}`}</Text>
      <Text style={styles.text}>{problem.note}</Text>
      {problem.photos.length || (room && onAddPhoto) ? (
        <View style={styles.photos}>
          {problem.photos.map((photo, i) => (
            <Pressable key={photo.id} accessibilityRole="imagebutton" accessibilityLabel={`Photo ${i + 1}`} onPress={() => WebBrowser.openBrowserAsync(photo.url)}>
              <Image source={{ uri: photo.url }} style={styles.photo} accessibilityIgnoresInvertColors />
            </Pressable>
          ))}
          {room && onAddPhoto ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Add a photo" onPress={onAddPhoto} disabled={adding} style={[styles.photo, styles.add, adding && styles.busy]}>
              <Ionicons name="camera-outline" size={22} color={Brand.textMuted} />
              <Text style={styles.faint}>{adding ? 'Adding…' : 'Add photo'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <Text style={[styles.muted, !open && styles.answer]}>{resolutionLine(problem, forShop)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.warning },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { ...Typography.bodyStrong, color: Brand.text, flex: 1 },
  text: { ...Typography.body, color: Brand.text },
  muted: { ...Typography.caption, color: Brand.textMuted },
  faint: { ...Typography.caption, fontSize: 12, color: Brand.textMuted },
  answer: { color: Brand.text },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  photo: { width: 80, height: 80, borderRadius: Radius.sm, backgroundColor: Brand.surfaceAlt },
  add: { alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 1, borderStyle: 'dashed', borderColor: Brand.border },
  busy: { opacity: 0.6 },
});
