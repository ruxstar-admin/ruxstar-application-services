/**
 * useCashfreePayment — React hook wrapping the Cashfree React Native SDK.
 *
 * Expo Go compatibility:
 *   The Cashfree native bridge isn't linked in Expo Go. All SDK calls are wrapped in
 *   try/catch at the point of USE (not just at import time) so the app never crashes.
 *   A simulation dialog appears instead, letting you test the full booking + success
 *   flow without a dev build.
 *
 * Real payments require:
 *   eas build --profile development --platform android
 */

import { Alert } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StartPaymentArgs {
  paymentSessionId: string;
  orderId?:   string;
  bookingId:  string;
  mode?:      string;   // 'sandbox' | 'production'
}

interface Options {
  onSuccess: (bookingId: string) => void;
  onError:   (message: string)   => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useCashfreePayment({ onSuccess, onError }: Options) {
  const [paying, setPaying] = useState(false);
  const bookingIdRef = useRef<string>('');

  // Keep stable refs so effect dep array never changes
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef   = useRef(onError);
  useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);
  useEffect(() => { onErrorRef.current   = onError;   }, [onError]);

  useEffect(() => {
    // Wrap in try/catch — CFPaymentGatewayService.setCallback() throws in Expo Go
    // because the native bridge isn't registered, even though the JS import succeeds.
    let cleanup: (() => void) | undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { CFPaymentGatewayService } = require('react-native-cashfree-pg-sdk');

      CFPaymentGatewayService.setCallback({
        onVerify(_cfOrderId: string) {
          setPaying(false);
          onSuccessRef.current(bookingIdRef.current);
        },
        onError(error: unknown, _cfOrderId: string) {
          setPaying(false);
          const e   = error as Record<string, unknown>;
          const msg = (typeof e?.message === 'string' ? e.message : null)
            || (typeof e?.status  === 'string' ? e.status  : null)
            || 'Payment was not completed. Please try again.';
          onErrorRef.current(msg);
        },
      });

      cleanup = () => {
        try { CFPaymentGatewayService.removeCallback(); } catch { /* ignore */ }
      };
    } catch {
      // Native SDK not linked (Expo Go) — silently skip registration
    }

    return cleanup;
  }, []);

  const startPayment = useCallback(
    ({ paymentSessionId, orderId, bookingId, mode }: StartPaymentArgs) => {
      if (!paymentSessionId) {
        onErrorRef.current('No payment session. Please try again.');
        return;
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { CFPaymentGatewayService } = require('react-native-cashfree-pg-sdk');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { CFEnvironment, CFSession } = require('cashfree-pg-api-contract');

        // This line throws in Expo Go — caught below → simulation dialog shown
        const env     = mode === 'production' ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX;
        const cfOrder = orderId || bookingId;
        const session = new CFSession(paymentSessionId, cfOrder, env);

        bookingIdRef.current = bookingId;
        setPaying(true);
        CFPaymentGatewayService.doWebPayment(session);

      } catch (e: unknown) {
        // Native bridge not available — show Expo Go simulation dialog
        const msg = e instanceof Error ? e.message : '';
        const isLinkError = msg.includes('linked') || msg.includes('Native') || msg.includes('bridge');

        if (isLinkError || !msg) {
          Alert.alert(
            'Payment Unavailable',
            'Online payment is not available in the test app.\n\nDownload the full Ruxstar app to complete your booking.',
            [{ text: 'OK' }],
          );
        } else {
          // Real SDK error (in a dev build) — surface it normally
          setPaying(false);
          onErrorRef.current(msg || 'Could not start payment.');
        }
      }
    },
    [],
  );

  return { startPayment, paying };
}
