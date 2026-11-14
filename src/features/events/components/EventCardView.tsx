import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { ShopCover } from '@/features/pod/components/ShopCover';
import { Feedback } from '@/lib/haptics';
import type { EventCard } from '@/types/events';
import { KIND_ICON, KIND_LABEL, dayText, placeLine, priceLine, timeText } from '../lib/events';

/** A date block drawn over the poster: "16 NOV". */
function DateTag({ iso }: { iso: string }) {
  const [, day, month] = dayText(iso).replace(',', '').split(' ');
  return (
    <View style={styles.dateTag}>
      <Text style={styles.dateDay}>{day}</Text>
      <Text style={styles.dateMonth}>{month?.toUpperCase()}</Text>
    </View>
  );
}

/** An event on Discover: the poster with its date, then the title, when, where and price. */
export function EventCardView({ event, onPress }: { event: EventCard; onPress: () => void }) {
  const { width } = useWindowDimensions();
  const place = placeLine(event);
  const price = priceLine(event);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[event.title, dayText(event.startsAt), timeText(event.startsAt), place, event.soldOut ? 'sold out' : price].join(', ')}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <ShopCover photo={event.photo ? { ...event.photo, smaller: [] } : null} name={event.title} width={width} style={styles.cover} dimmed={event.soldOut}>
        <View style={styles.overlay}>
          <DateTag iso={event.startsAt} />
          {event.soldOut ? (
            <View style={styles.soldOut}>
              <Text style={styles.soldOutText}>Sold out</Text>
            </View>
          ) : null}
        </View>
      </ShopCover>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {`${dayText(event.startsAt)} · ${timeText(event.startsAt)} · ${event.business.name}`}
        </Text>
        <View style={styles.facts}>
          <View style={styles.fact}>
            <Ionicons name={event.online ? 'videocam-outline' : 'location-outline'} size={14} color={Brand.textMuted} />
            <Text style={styles.factText} numberOfLines={1}>
              {place}
            </Text>
          </View>
          <View style={styles.fact}>
            <Ionicons name={KIND_ICON[event.kind]} size={14} color={Brand.textMuted} />
            <Text style={styles.factText} numberOfLines={1}>
              {KIND_LABEL[event.kind]}
            </Text>
          </View>
          <Text style={[styles.price, event.free && styles.free]}>{price}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, overflow: 'hidden' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  cover: { width: '100%', aspectRatio: 16 / 9 },
  overlay: { position: 'absolute', top: Spacing.two, left: Spacing.two, right: Spacing.two, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dateTag: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.md, backgroundColor: 'rgba(13,12,18,0.78)' },
  dateDay: { ...Typography.bodyStrong, fontSize: 18, lineHeight: 20, color: Brand.text },
  dateMonth: { ...Typography.caption, fontSize: 11, letterSpacing: 1, color: Brand.primarySoft },
  soldOut: { paddingHorizontal: 10, height: 26, justifyContent: 'center', borderRadius: Radius.pill, backgroundColor: 'rgba(255,69,58,0.9)' },
  soldOutText: { ...Typography.caption, fontSize: 12, color: Brand.text, fontFamily: Typography.bodyStrong.fontFamily },
  body: { padding: Spacing.three, gap: Spacing.one },
  title: { ...Typography.heading, fontSize: 17, lineHeight: 23, color: Brand.text },
  meta: { ...Typography.caption, color: Brand.textMuted },
  facts: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginTop: Spacing.one },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  factText: { ...Typography.caption, fontSize: 12, color: Brand.textMuted },
  price: { ...Typography.bodyStrong, fontSize: 14, color: Brand.primarySoft, marginLeft: 'auto' },
  free: { color: Brand.success },
});
