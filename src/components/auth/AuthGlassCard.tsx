/**
 * AuthGlassCard — frosted glass panel anchored to the bottom of the screen,
 * sliding/fading up on mount. Same recipe as welcome.tsx's bottom card
 * (BlurView on iOS, translucent solid on Android, gradient hairline border)
 * so login/OTP/sign-up visually match the welcome screen instead of floating
 * plain white pills directly on the video.
 */

import React from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Spacing } from "@/constants/theme";

function GlassView({
  intensity,
  tint,
  style,
  children,
}: {
  intensity: number;
  tint: "dark" | "light" | "default";
  style?: ViewStyle;
  children: React.ReactNode;
}) {
  if (Platform.OS === "android") {
    // expo-blur has no true blur on Android without extra native config —
    // fall back to a strong translucent white for the same frosted-but-white feel.
    return (
      <View style={[style, { backgroundColor: "rgba(255,255,255,0.94)" }]}>
        {children}
      </View>
    );
  }
  // The video sitting behind this card is already darkened (blur + gradient
  // in AuthVideoBackdrop), so a plain "light" BlurView tint alone samples
  // that dark backdrop and reads as grey, not white. Layer an explicit white
  // wash on top of the blur so the card is unambiguously a white card, with
  // just enough blur showing through at the edges for the frosted feel.
  return (
    <BlurView intensity={intensity} tint={tint} style={style}>
      <View style={[StyleSheet.absoluteFill, s.whiteWash]} pointerEvents="none" />
      {children}
    </BlurView>
  );
}

export default function AuthGlassCard({
  children,
  delay = 200,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(650)} style={[s.card, style]}>
      <LinearGradient
        colors={["rgba(255,255,255,0.55)", "rgba(255,255,255,0.15)", "rgba(255,255,255,0.35)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.borderGradient}
      >
        <GlassView intensity={85} tint="light" style={s.content}>
          {children}
        </GlassView>
      </LinearGradient>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  whiteWash: { backgroundColor: "rgba(255,255,255,0.72)" },

  card: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.four,
    borderRadius: 28,
  },
  borderGradient: {
    borderRadius: 28,
    padding: 1.2,
  },
  content: {
    borderRadius: 27,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
    overflow: "hidden",
  },
});
