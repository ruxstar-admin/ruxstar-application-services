/**
 * KYC index — routing hub
 * Fetches current KYC status and redirects to the correct step screen.
 */
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { useKycStore, nextKycStep } from '@/stores/kyc-store';
import { Brand } from '@/constants/theme';

export default function KycIndexScreen() {
  const token       = useAuthStore((s) => s.token);
  const fetchStatus = useKycStore((s) => s.fetchStatus);

  useEffect(() => {
    if (!token) return;

    fetchStatus(token)
      .then((status) => {
        const step = nextKycStep(status);
        switch (step) {
          case 'verified':
            router.replace('/(vendor)/');
            break;
          case 'pending_review':
            router.replace('/(vendor)/kyc/pending-review');
            break;
          case 'rejected':
            router.replace('/(vendor)/kyc/rejected');
            break;
          case 'aadhaar':
            router.replace('/(vendor)/kyc/aadhaar');
            break;
          case 'pan':
            router.replace('/(vendor)/kyc/pan');
            break;
          case 'face':
            router.replace('/(vendor)/kyc/face');
            break;
        }
      })
      .catch(() => {
        // On error default to aadhaar step
        router.replace('/(vendor)/kyc/aadhaar');
      });
  }, [token, fetchStatus]);

  return (
    <View style={s.root}>
      <ActivityIndicator size="large" color={Brand.primary} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.bg, alignItems: 'center', justifyContent: 'center' },
});
