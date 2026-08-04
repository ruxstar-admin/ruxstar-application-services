/**
 * vendor-details.tsx — safety redirect
 *
 * This screen is NOT part of the active signup flow.
 * Real vendor signup completes in register/details.tsx which calls
 * AuthService.signupComplete() and routes to /(vendor)/kyc with a real token.
 *
 * If a user somehow lands here, we immediately forward them to KYC so they
 * are never set up with a fake/demo token.
 */

import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Brand } from '@/constants/theme';

export default function VendorDetailsScreen() {
  useEffect(() => {
    // Forward immediately — never set demo tokens
    router.replace('/(vendor)/kyc' as never);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Brand.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={Brand.primary} />
    </View>
  );
}
