/**
 * AuthVideoBackdrop — per-screen foreground chrome for the auth flow.
 * The looping video itself is rendered ONCE by the parent (auth) layout
 * (AuthBackgroundVideo) so it never restarts between screens. On top of it
 * this adds: a real-time blur (frosting the video, like the soft-focus photo
 * in the reference form-step screenshot — welcome.tsx stays sharp on
 * purpose, only these secondary screens get the frosted look), a dark
 * contrast gradient so white hero text stays legible, and the safe-area +
 * back button.
 */

import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

export default function AuthVideoBackdrop({
  onBack,
  children,
}: {
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={s.root}>
      {/* Frost the shared video — real backdrop blur on iOS; Android's
          BlurView has no true backdrop blur, so pair it with a soft tint. */}
      <BlurView
        intensity={Platform.OS === "ios" ? 35 : 60}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      {Platform.OS === "android" && (
        <View style={[StyleSheet.absoluteFill, s.androidFrost]} />
      )}

      <LinearGradient
        colors={["rgba(0,0,0,0.25)", "rgba(0,0,0,0.15)", "rgba(0,0,0,0.65)"]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={s.safe}>
        {onBack && (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
            hitSlop={12}
          >
            <Text style={s.backArrow}>←</Text>
          </Pressable>
        )}
        {children}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "transparent" },
  safe: { flex: 1 },
  androidFrost: { backgroundColor: "rgba(255,255,255,0.06)" },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
    marginTop: 8,
  },
  backArrow: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
