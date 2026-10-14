import { Pressable, StyleSheet, Text } from 'react-native';
import { Brand, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

interface TextLinkProps {
  label: string;
  onPress: () => void;
  muted?: boolean;
}

/** Inline text action with the dotted underline District uses for links ("Back to login"). */
export function TextLink({ label, onPress, muted }: TextLinkProps) {
  return (
    <Pressable
      accessibilityRole="link"
      hitSlop={8}
      onPress={() => {
        Feedback.select();
        onPress();
      }}
    >
      <Text style={[styles.text, muted && styles.muted]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: {
    ...Typography.body,
    color: Brand.text,
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
  muted: { ...Typography.caption, color: Brand.textMuted },
});
