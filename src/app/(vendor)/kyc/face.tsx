/**
 * KYC Step 3 — Face / Selfie verification
 * Uses expo-camera for live capture + expo-image-manipulator for JPEG compression.
 */
import { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, Pressable,
  ActivityIndicator, ScrollView, Image,
} from 'react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/stores/auth-store';
import { useKycStore, nextKycStep } from '@/stores/kyc-store';
import { KycService } from '@/services/kyc-service';
import { Brand, Radius, Spacing } from '@/constants/theme';

const MAX_BYTES    = 5 * 1024 * 1024; // 5 MB
const JPEG_QUALITY = 0.8;

/** Strip data-URL prefix leaving raw base64 */
function stripPrefix(dataUrl: string): string {
  const idx = dataUrl.indexOf(',');
  return idx !== -1 ? dataUrl.slice(idx + 1) : dataUrl;
}

/** Estimate decoded byte length of a base64 string */
function base64Size(b64: string): number {
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

export default function FaceScreen() {
  const insets      = useSafeAreaInsets();
  const token       = useAuthStore((s) => s.token);
  const fetchStatus = useKycStore((s) => s.fetchStatus);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [preview,    setPreview]    = useState<string | null>(null); // data URL
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  // ── Capture ────────────────────────────────────────────────────────────────

  async function takePhoto() {
    setError('');
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: JPEG_QUALITY,
        base64: false,
        skipProcessing: false,
      });
      if (!photo) return;
      setPreview(photo.uri);
    } catch {
      setError('Could not capture photo. Try again.');
    }
  }

  function retake() {
    setPreview(null);
    setError('');
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!token || !preview) return;
    setError('');
    setSubmitting(true);

    try {
      // Compress to JPEG ≤ 5 MB
      let uri = preview;
      let base64: string | undefined;

      // First attempt at JPEG_QUALITY
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [],
        { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      base64 = result.base64;

      // Recompress if over limit
      if (base64 && base64Size(base64) > MAX_BYTES) {
        const r2 = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 800 } }],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true },
        );
        base64 = r2.base64;
      }

      if (!base64) throw new Error('Could not process image. Try again.');
      if (base64Size(base64) > MAX_BYTES) throw new Error('Image is too large. Try again with better lighting.');

      await KycService.submitFace(token, base64);

      // Refresh and route
      const status = await fetchStatus(token);
      const step   = nextKycStep(status);

      switch (step) {
        case 'pending_review':  router.replace('/(vendor)/kyc/pending-review'); break;
        case 'verified':        router.replace('/(vendor)/');                   break;
        case 'rejected':        router.replace('/(vendor)/kyc/rejected');       break;
        default:                router.replace('/(vendor)/kyc/face');           break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Selfie submission failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Permission gate ────────────────────────────────────────────────────────

  if (!permission) {
    return <LoadingView />;
  }

  if (!permission.granted) {
    return (
      <View style={[s.root, s.center, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={Brand.bg} />
        <View style={s.permBox}>
          <Text style={s.permIcon}>📷</Text>
          <Text style={s.permTitle}>Camera access needed</Text>
          <Text style={s.permSub}>
            We need camera access to take your selfie for identity verification.
          </Text>
          <Pressable style={s.btn} onPress={requestPermission}>
            <Text style={s.btnText}>Grant camera access</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
      scrollEnabled={!!preview}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Brand.bg} />

      <StepDots current={2} />

      <Text style={s.title}>Take a selfie</Text>
      <Text style={s.sub}>
        Position your face in the oval, ensure good lighting, and tap Capture. We'll match it
        against your Aadhaar photo.
      </Text>

      {/* Camera / Preview */}
      <View style={s.cameraWrap}>
        {preview ? (
          <Image source={{ uri: preview }} style={s.preview} resizeMode="cover" />
        ) : (
          <CameraView
            ref={cameraRef}
            style={s.camera}
            facing="front"
          >
            {/* Oval guide overlay */}
            <View style={s.ovalGuide} />
          </CameraView>
        )}
      </View>

      {error ? (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={s.actions}>
        {preview ? (
          <>
            <Pressable style={[s.btnOutline, submitting && s.btnDisabled]} onPress={retake} disabled={submitting}>
              <Text style={s.btnOutlineText}>Retake</Text>
            </Pressable>
            <Pressable style={[s.btn, s.btnFlex, submitting && s.btnDisabled]} onPress={handleSubmit} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={s.btnText}>Submit selfie</Text>
              )}
            </Pressable>
          </>
        ) : (
          <Pressable style={[s.btn, s.btnFull]} onPress={takePhoto}>
            <Text style={s.btnText}>Capture photo</Text>
          </Pressable>
        )}
      </View>

      <Text style={s.footnote}>
        JPEG only · max 5 MB · live capture only (no gallery uploads)
      </Text>
    </ScrollView>
  );
}

function LoadingView() {
  return (
    <View style={[s.root, s.center]}>
      <ActivityIndicator size="large" color={Brand.primary} />
    </View>
  );
}

function StepDots({ current }: { current: number }) {
  const labels = ['Aadhaar', 'PAN', 'Selfie'];
  return (
    <View style={s.dots}>
      {labels.map((label, i) => (
        <View key={label} style={s.dotWrap}>
          <View style={[s.dot, i === current && s.dotActive, i < current && s.dotDone]}>
            {i < current ? (
              <Text style={s.dotTick}>✓</Text>
            ) : (
              <Text style={[s.dotNum, i === current && s.dotNumActive]}>{i + 1}</Text>
            )}
          </View>
          {i < labels.length - 1 && <View style={[s.dotLine, i < current && s.dotLineDone]} />}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Brand.bg },
  content: { paddingHorizontal: Spacing.four, gap: Spacing.three },
  center:  { alignItems: 'center', justifyContent: 'center' },

  // ── Step dots ──────────────────────────────────────────────────────────────
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two },
  dotWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Brand.surface2, borderWidth: 1, borderColor: Brand.border2,
    alignItems: 'center', justifyContent: 'center',
  },
  dotActive: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  dotDone:   { backgroundColor: Brand.success,  borderColor: Brand.success },
  dotNum:    { fontSize: 12, fontWeight: '600', color: Brand.creamMuted },
  dotNumActive: { color: '#FFFFFF' },
  dotTick:   { fontSize: 11, color: '#FFFFFF', fontWeight: '700' },
  dotLine:   { width: 32, height: 1, backgroundColor: Brand.border2 },
  dotLineDone: { backgroundColor: Brand.success },

  // ── Text ───────────────────────────────────────────────────────────────────
  title: { color: Brand.cream,    fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: -0.4 },
  sub:   { color: Brand.creamSub, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  // ── Camera ─────────────────────────────────────────────────────────────────
  cameraWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Brand.border1,
    backgroundColor: '#000',
  },
  camera:  { flex: 1 },
  preview: { flex: 1, width: '100%', height: '100%' },
  ovalGuide: {
    position: 'absolute',
    top: '10%',
    left: '15%',
    right: '15%',
    bottom: '10%',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.60)',
    borderStyle: 'dashed',
  },

  // ── Actions ────────────────────────────────────────────────────────────────
  actions: { flexDirection: 'row', gap: Spacing.two },
  btn: {
    backgroundColor: Brand.primary,
    borderRadius: Radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  btnFlex: { flex: 1 },
  btnFull: { flex: 1 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  btnOutline: {
    flex: 1,
    borderRadius: Radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Brand.border2,
  },
  btnOutlineText: { color: Brand.creamSub, fontSize: 15, fontWeight: '600' },

  // ── Permission box ─────────────────────────────────────────────────────────
  permBox: {
    backgroundColor: Brand.surface1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Brand.border1,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.three,
    marginHorizontal: Spacing.four,
  },
  permIcon:  { fontSize: 40 },
  permTitle: { color: Brand.cream,    fontSize: 18, fontWeight: '700', textAlign: 'center' },
  permSub:   { color: Brand.creamSub, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // ── Error ──────────────────────────────────────────────────────────────────
  errorBox: {
    backgroundColor: 'rgba(220,38,38,0.06)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.20)',
    padding: Spacing.three,
  },
  errorText: { color: Brand.error, fontSize: 13, lineHeight: 20 },

  footnote: { color: Brand.creamMuted, fontSize: 11, textAlign: 'center', lineHeight: 16 },
});
