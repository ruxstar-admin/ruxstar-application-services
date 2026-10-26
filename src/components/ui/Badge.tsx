import { StyleSheet, Text, View } from 'react-native';
import { Brand, Fonts, Radius, Spacing } from '@/constants/theme';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'error';

interface BadgeProps {
  label: string;
  tone?: Tone;
}

const TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: Brand.surfaceAlt, fg: Brand.textMuted },
  accent: { bg: 'rgba(180,92,242,0.18)', fg: Brand.primarySoft },
  success: { bg: 'rgba(52,199,89,0.16)', fg: Brand.success },
  warning: { bg: 'rgba(255,176,32,0.16)', fg: Brand.warning },
  error: { bg: 'rgba(255,69,58,0.16)', fg: Brand.error },
};

/** Small status / role pill ("Vendor", "Verified", "Pending"). */
export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const { bg, fg } = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.two + 2, paddingVertical: 4, borderRadius: Radius.pill },
  label: { fontFamily: Fonts.semibold, fontSize: 12, letterSpacing: 0.2 },
});
