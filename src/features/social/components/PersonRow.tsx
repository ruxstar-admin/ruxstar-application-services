import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { VerifiedTick } from '@/features/kyc/components/VerifiedTick';
import type { Author } from '@/types/social';

/** One person in a list: photo, name and handle, and an action on the right. */
export function PersonRow({ person, onPress, right }: { person: Author; onPress?: () => void; right?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? `Open ${person.name}'s profile` : person.name}
        disabled={!onPress}
        style={styles.who}
        onPress={onPress}
      >
        <Avatar name={person.name} uri={person.avatarUrl} size={44} />
        <View style={styles.text}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {person.name}
            </Text>
            {person.verified ? <VerifiedTick /> : null}
            {person.isVendor ? <Badge label="Store" tone="accent" /> : null}
          </View>
          <Text style={styles.username} numberOfLines={1}>
            @{person.username}
          </Text>
        </View>
      </Pressable>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  text: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  name: { ...Typography.bodyStrong, color: Brand.text, flexShrink: 1 },
  username: { ...Typography.caption, color: Brand.textMuted },
});
