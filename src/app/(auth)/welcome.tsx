import React from "react";
import {
  View,
  Text,
  Image,
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
  withTiming,
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
            <View style={s.logoPad}>
              <Image
                source={require("../../../assets/images/logo-combined.png")}
                style={s.logoImage}
                resizeMode="contain"
              />
            </View>
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
  logoBlock: { alignItems: "center" },
  logoPad: {
    backgroundColor: "#000000",
    borderRadius: 16,
    padding: 10,
  },
  logoImage: {
    width: 90,
    height: 90,
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
