import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius } from '@/constants/theme';

/** The tick box drawn inside a pressable row; the row carries the checkbox role and state. */
export function Tick({ checked }: { checked: boolean }) {
  return <View style={[styles.box, checked && styles.checked]}>{checked ? <Ionicons name="checkmark" size={20} color={Brand.text} /> : null}</View>;
}

const styles = StyleSheet.create({
  box: { width: 28, height: 28, borderRadius: Radius.sm, borderWidth: 2, borderColor: Brand.textFaint, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: Brand.primaryDeep, borderColor: Brand.primaryDeep },
});
