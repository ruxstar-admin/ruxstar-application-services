import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { VideoView, useVideoPlayer } from "expo-video";
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { Spacing, Radius } from "@/constants/theme";

const BG_VIDEO = require("../../../assets/backgorund_white.mp4");

const C = {
  bg: "#FFFFFF",
  dark: "#0A0A0F",
  text: "#0A0A0F",
  dim: "rgba(0,0,0,0.45)",
} as const;

// ─── GlassView — BlurView on iOS, solid fallback on Android ──────────────────

function GlassView({
  intensity,
  tint,
  style,
  children,
}: {
  intensity: number;
  tint: "dark" | "light" | "default";
  style?: any;
  children: React.ReactNode;
}) {
  if (Platform.OS === "android") {
    return (
      <View style={[style, { backgroundColor: "rgba(255,255,255,0.92)" }]}>
        {children}
      </View>
    );
  }
  return (
    <BlurView intensity={intensity} tint={tint} style={style}>
      {children}
    </BlurView>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

function Btn({
  label,
  onPress,
  primary = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pressHandlers = {
    onPressIn: () => scale.value = withTiming(0.97, { duration: 80 }),
    onPressOut: () => scale.value = withTiming(1, { duration: 150 }),
  };

  // ── Primary (Sign up) ──
  if (primary) {
    return (
      <Animated.View style={anim}>
        <Pressable
          onPress={onPress}
          {...pressHandlers}
          style={[s.btn, s.btnPrimary]}
          accessibilityRole="button"
        >
          <Text style={s.btnLabelPrimary}>{label}</Text>
          <Text style={s.arrow}>→</Text>
        </Pressable>
      </Animated.View>
    );
  }

  // ── Black (Log in) ──
  return (
    <Animated.View style={anim}>
      <Pressable
        onPress={onPress}
        {...pressHandlers}
        style={[s.btn, s.btnBlack]}
        accessibilityRole="button"
      >
        <Text style={s.btnLabelBlack}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WelcomeScreen() {
  // Background video — looping, muted, auto-play
  const player = useVideoPlayer(BG_VIDEO, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const pulse = useSharedValue(0);
  const glowAnim = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 0.85 + pulse.value * 0.15 }],
  }));

  useEffect(() => {
    pulse.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(0.5, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Full-screen looping video background ── */}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
      />


      <SafeAreaView style={s.safe}>
        {/* ── Logo ── */}
        <View style={s.centerBlock}>
          <Animated.View
            entering={FadeIn.delay(80).duration(600)}
            style={s.logoBlock}
          >
            <Animated.View style={[s.glowRing, glowAnim]} />
            <View style={s.logoOuter}>
              <View style={s.logoMark}>
                <Text style={s.logoLetter}>R</Text>
              </View>
            </View>
            <Text style={s.brandName}>RUXSTAR</Text>
            <Text style={s.brandTagline}>One platform. Every business.</Text>
          </Animated.View>
        </View>

        {/* ── Bottom glass card ── */}
        <Animated.View
          entering={FadeInUp.delay(900).duration(700)}
          style={s.glassCard}
        >
          {/* Card border gradient */}
          <LinearGradient
            colors={[
              "rgba(0,0,0,0.10)",
              "rgba(0,0,0,0.04)",
              "rgba(0,0,0,0.08)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.cardBorderGradient}
          >
            <GlassView intensity={60} tint="light" style={s.cardContent}>
              <Btn
                label="Sign up"
                onPress={() => router.push("/(auth)/register")}
                primary
              />
              <Btn label="Log in" onPress={() => router.push("/(auth)/login")} />
              <Text style={s.footer}>
                By continuing you agree to our{" "}
                <Text style={s.footerLink}>Terms</Text> &amp;{" "}
                <Text style={s.footerLink}>Privacy Policy</Text>
              </Text>
            </GlassView>
          </LinearGradient>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  safe: { flex: 1 },

  centerBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },

  // ── Logo ──
  logoBlock: { alignItems: "center", gap: Spacing.two },
  glowRing: {
    position: "absolute",
    top: -22,
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: "rgba(0,0,0,0.02)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 0,
  },
  logoOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoMark: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: C.dark,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 12,
    elevation: 10,
  },
  logoLetter: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  brandName: {
    color: C.text,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 7,
    textAlign: "center",
    marginTop: Spacing.one,
  },
  brandTagline: {
    color: C.dim,
    fontSize: 13,
    letterSpacing: 0.3,
    textAlign: "center",
  },

  // ── Bottom glass card ──
  glassCard: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.four,
    borderRadius: 28,
  },
  cardBorderGradient: {
    borderRadius: 28,
    padding: 1.2,
  },
  cardContent: {
    borderRadius: 27,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
    overflow: "hidden",
  },

  // ── Primary (Sign up) button ──
  btn: {
    borderRadius: Radius.pill,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnPrimary: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.22)",
  },
  btnLabelPrimary: { color: C.dark, fontSize: 16, fontWeight: "700" },
  arrow: { color: C.dark, fontSize: 16, fontWeight: "700" },

  // ── Black (Log in) button ──
  btnBlack: {
    backgroundColor: "#08080D",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  btnLabelBlack: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },

  // ── Footer ──
  footer: {
    color: "rgba(0,0,0,0.35)",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
  footerLink: { color: "rgba(0,0,0,0.55)", fontWeight: "600" },
});
