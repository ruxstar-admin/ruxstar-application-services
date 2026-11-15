import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { dayText } from '@/features/events/lib/events';
import { ShopCover } from '@/features/pod/components/ShopCover';
import { Feedback } from '@/lib/haptics';
import type { CourseCard } from '@/types/coaching';
import { CATEGORY_ICON, CATEGORY_LABEL, demoLine, feeLine, placeLine } from '../lib/coaching';

/** A course on Discover: the photo, then the title, institute, where, the next start and the fee. */
export function CourseCardView({ course, onPress }: { course: CourseCard; onPress: () => void }) {
  const { width } = useWindowDimensions();
  const place = placeLine(course);
  const fee = feeLine(course);
  const demo = demoLine(course.demo);
  const starts = course.nextStart ? `Next batch starts ${dayText(course.nextStart)}` : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[course.title, course.business.name, place, starts, fee, demo].filter(Boolean).join(', ')}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <ShopCover photo={course.photo ? { ...course.photo, smaller: [] } : null} name={course.title} width={width} style={styles.cover} dimmed={!course.openBatches}>
        {demo ? (
          <View style={styles.overlay}>
            <View style={styles.demo}>
              <Text style={styles.demoText}>{demo}</Text>
            </View>
          </View>
        ) : null}
      </ShopCover>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {course.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {starts ? `${course.business.name} · ${starts}` : course.business.name}
        </Text>
        <View style={styles.facts}>
          <View style={styles.fact}>
            <Ionicons name={course.mode === 'online' ? 'videocam-outline' : 'location-outline'} size={14} color={Brand.textMuted} />
            <Text style={styles.factText} numberOfLines={1}>
              {place}
            </Text>
          </View>
          <View style={styles.fact}>
            <Ionicons name={CATEGORY_ICON[course.category]} size={14} color={Brand.textMuted} />
            <Text style={styles.factText} numberOfLines={1}>
              {CATEGORY_LABEL[course.category]}
            </Text>
          </View>
          <Text style={[styles.price, course.feeFrom === 0 && styles.free]}>{fee}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, overflow: 'hidden' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  cover: { width: '100%', aspectRatio: 16 / 9 },
  overlay: { position: 'absolute', top: Spacing.two, left: Spacing.two, right: Spacing.two, flexDirection: 'row' },
  demo: { paddingHorizontal: 10, height: 26, justifyContent: 'center', borderRadius: Radius.pill, backgroundColor: 'rgba(13,12,18,0.78)' },
  demoText: { ...Typography.caption, fontSize: 12, color: Brand.primarySoft, fontFamily: Typography.bodyStrong.fontFamily },
  body: { padding: Spacing.three, gap: Spacing.one },
  title: { ...Typography.heading, fontSize: 17, lineHeight: 23, color: Brand.text },
  meta: { ...Typography.caption, color: Brand.textMuted },
  facts: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginTop: Spacing.one },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  factText: { ...Typography.caption, fontSize: 12, color: Brand.textMuted },
  price: { ...Typography.bodyStrong, fontSize: 14, color: Brand.primarySoft, marginLeft: 'auto' },
  free: { color: Brand.success },
});
