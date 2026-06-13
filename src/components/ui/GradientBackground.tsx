/**
 * GradientBackground — wraps expo-linear-gradient with sensible defaults.
 */
import { LinearGradient } from 'expo-linear-gradient';
import type { LinearGradientProps } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

type GradientBackgroundProps = Partial<Omit<LinearGradientProps, 'colors'>> & {
  colors?: LinearGradientProps['colors'];
  scrollable?: boolean;
  safeArea?: boolean;
  contentStyle?: object;
};

export default function GradientBackground({
  colors = ['#0A0314', '#1A0830'],
  style,
  scrollable: _scrollable,
  safeArea: _safeArea,
  contentStyle: _contentStyle,
  ...props
}: GradientBackgroundProps) {
  return (
    <LinearGradient
      colors={colors}
      style={[StyleSheet.absoluteFillObject, style]}
      {...props}
    />
  );
}
