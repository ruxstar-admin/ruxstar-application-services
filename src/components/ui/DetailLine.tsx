import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

/** A label over its value, as in payment details. `copyable` adds a copy button for IDs. */
export function DetailLine({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  const copy = async () => {
    await Clipboard.setStringAsync(value);
    Feedback.success();
  };
  return (
    <View style={styles.line}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value} selectable>
          {value}
        </Text>
        {copyable ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Copy ${label}`} onPress={() => void copy()} hitSlop={8}>
            <Ionicons name="copy-outline" size={16} color={Brand.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { gap: 2 },
  label: { ...Typography.caption, color: Brand.textMuted },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  value: { ...Typography.body, fontSize: 15, color: Brand.text, flexShrink: 1 },
});
