import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '@/constants/theme';
import { starsLabel } from '@/features/reviews/lib/review';
import { Feedback } from '@/lib/haptics';

const STARS = [1, 2, 3, 4, 5];

/** A review's stars, read only. */
export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={styles.row} accessibilityLabel={starsLabel(value)} accessible>
      {STARS.map((n) => (
        <Ionicons key={n} name={n <= value ? 'star' : 'star-outline'} size={size} color={n <= value ? Brand.warning : Brand.textFaint} />
      ))}
    </View>
  );
}

/** Five stars to tap; 0 is none picked yet. */
export function StarPicker({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <View style={styles.picker} accessibilityRole="adjustable" accessibilityLabel="Rating" accessibilityValue={{ min: 1, max: 5, now: value || undefined }}>
      {STARS.map((n) => (
        <Pressable
          key={n}
          accessibilityRole="button"
          accessibilityLabel={starsLabel(n)}
          accessibilityState={{ selected: n === value, disabled }}
          hitSlop={4}
          disabled={disabled}
          onPress={() => {
            Feedback.select();
            onChange(n);
          }}
        >
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={34} color={n <= value ? Brand.warning : Brand.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
  picker: { flexDirection: 'row', gap: 10 },
});
