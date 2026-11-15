import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

interface ScreenHeaderProps {
  title: string;
  onBack: () => void;
  /** A small action at the far right, such as a menu button. */
  right?: React.ReactNode;
}

/** Back arrow + left-aligned title row used by every pushed auth screen. */
export function ScreenHeader({ title, onBack, right }: ScreenHeaderProps) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={12}
        onPress={() => {
          Feedback.tap();
          onBack();
        }}
      >
        <Ionicons name="arrow-back" size={26} color={Brand.text} />
      </Pressable>
      <Text style={[styles.title, !!right && styles.flex]} numberOfLines={right ? 1 : undefined}>
        {title}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  title: { ...Typography.title, color: Brand.text },
  flex: { flex: 1 },
});
