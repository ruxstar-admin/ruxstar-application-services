import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { ratingLine } from '@/features/reviews/lib/review';
import { Feedback } from '@/lib/haptics';
import type { FreelancerRef } from '@/types/gigs';
import type { Rating } from '@/types/review';

/** Who's behind a gig: photo, name, headline, city and rating. Opens their page. */
export function FreelancerRow({ freelancer, rating, onPress }: { freelancer: FreelancerRef; rating?: Rating; onPress?: () => void }) {
  const stars = rating ? ratingLine(rating) : null;
  const lines = [freelancer.headline, [freelancer.city, stars].filter(Boolean).join(' · ')].filter(Boolean);
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[freelancer.name, ...lines].join(', ')}
      disabled={!onPress}
      onPress={() => {
        Feedback.tap();
        onPress?.();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Avatar name={freelancer.name} uri={freelancer.avatarUrl ?? undefined} size={48} />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {freelancer.name}
        </Text>
        {lines.map((l) => (
          <Text key={l} style={styles.small} numberOfLines={2}>
            {l}
          </Text>
        ))}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={Brand.textFaint} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  pressed: { opacity: 0.8 },
  text: { flex: 1, gap: 2 },
  name: { ...Typography.bodyStrong, fontSize: 16, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
});
