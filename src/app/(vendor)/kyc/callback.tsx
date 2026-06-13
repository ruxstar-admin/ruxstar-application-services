/**
 * KYC DigiLocker callback — deep link return
 * Scheme: ruxstarapplicationservices://kyc/callback
 *
 * After DigiLocker redirects back to this screen we call syncAadhaar,
 * then re-route to the appropriate next step.
 */
import { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { useKycStore, nextKycStep } from '@/stores/kyc-store';
import { KycService } from '@/services/kyc-service';
import { Brand, Radius, Spacing } from '@/constants/theme';

export default function KycCallbackScreen() {
  const token       = useAuthStore((s) => s.token);
  const fetchStatus = useKycStore((s) => s.fetchStatus);
  const calledRef   = useRef(false);

  useEffect(() => {
    if (!token || calledRef.current) return;
    calledRef.current = true;

    (async () => {
      try {
        // Give DigiLocker a brief moment to settle, then sync
        await new Promise<void>((r) => setTimeout(r, 800));
        await KycService.syncAadhaar(token);

        // Refresh status and route
        const status = await fetchStatus(token);
        const step   = nextKycStep(status);

        switch (step) {
          case 'pan':             router.replace('/(vendor)/kyc/pan');            break;
          case 'face':            router.replace('/(vendor)/kyc/face');           break;
          case 'pending_review':  router.replace('/(vendor)/kyc/pending-review'); break;
          case 'verified':        router.replace('/(vendor)/');                   break;
          case 'rejected':        router.replace('/(vendor)/kyc/rejected');       break;
          default:                router.replace('/(vendor)/kyc/aadhaar');        break;
        }
      } catch {
        // Sync failed — go back to aadhaar to retry
        router.replace('/(vendor)/kyc/aadhaar');
      }
    })();
  }, [token, fetchStatus]);

  return (
    <View style={s.root}>
      <View style={s.card}>
        <ActivityIndicator size="large" color={Brand.primary} />
        <Text style={s.title}>Syncing Aadhaar…</Text>
        <Text style={s.sub}>Please wait while we verify your DigiLocker data.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.bg, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Brand.surface1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Brand.border1,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.three,
  },
  title: { color: Brand.cream,    fontSize: 17, fontWeight: '700', textAlign: 'center' },
  sub:   { color: Brand.creamSub, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
