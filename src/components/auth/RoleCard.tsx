/**
 * RoleCard — User / Vendor role selector card
 *
 * Features:
 *  • Glassmorphism card on dark background
 *  • Custom icon + title + subtitle
 *  • Spring press animation
 *  • Active / inactive state
 */

import React from 'react';
import { Pressable, Text, View, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { Brand, Radius, Spacing, Gradients } from '@/constants/theme';

interface RoleCardProps {
  icon: string;
  title: string;
  subtitle: string;
  variant: 'user' | 'vendor';
  selected?: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function RoleCard({
  icon,
  title,
  subtitle,
  variant,
  selected = false,
  onPress,
  style,
}: RoleCardProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const gradientColors = Gradients.cardUser; // both variants use purple

  const borderColor = selected ? Brand.primaryLight : Brand.glassBorder;

  const glowColor = 'rgba(124,58,237,0.3)';

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 12, stiffness: 200 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 10, stiffness: 150 });
      }}
      style={[animStyle, style]}
      accessibilityRole="button"
      accessibilityLabel={`Select ${title} role`}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          { borderColor },
          selected && {
            shadowColor: glowColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 16,
            elevation: 8,
          },
        ]}>

        {/* Icon circle */}
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: 'rgba(124,58,237,0.15)',
              borderColor: 'rgba(167,139,250,0.3)',
            },
          ]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>

        {/* Text */}
        <Text
          style={[
            styles.title,
            { color: selected ? '#ffffff' : Brand.primaryXLight },
          ]}>
          {title}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {/* Selected check */}
        {selected && (
          <View
            style={[
              styles.selectedBadge,
              {
                backgroundColor: Brand.primary,
              },
            ]}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
    minWidth: 150,
    position: 'relative',
    overflow: 'hidden',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    color: Brand.textOnDarkSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },
  selectedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
