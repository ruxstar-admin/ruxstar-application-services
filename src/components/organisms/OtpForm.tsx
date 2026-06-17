/**
 * OtpForm — Organism
 *
 * Self-contained OTP verification form:
 *   • Masked phone display
 *   • OtpInput molecule (6 cells)
 *   • "Verify & Continue" button
 *   • Countdown timer + Resend link
 *
 * All state lives here; the parent only sees onVerify(otp) / onResend().
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import OtpInput from '@/components/auth/OtpInput';
import PrimaryButton from '@/components/ui/PrimaryButton';
import CountdownTimer from '@/components/atoms/CountdownTimer';
import { Brand, Spacing, Radius } from '@/constants/theme';

interface OtpFormProps {
  /** Masked phone shown to user, e.g. "+91 ••••• 43210" */
  maskedPhone: string;
  onVerify: (otp: string) => void;
  onResend: () => void;
  isLoading?: boolean;
  isError?: boolean;
  isSuccess?: boolean;
  errorMessage?: string;
  /** Resend countdown seconds — default 60 */
  resendDelay?: number;
}

export default function OtpForm({
  maskedPhone,
  onVerify,
  onResend,
  isLoading = false,
  isError = false,
  isSuccess = false,
  errorMessage,
  resendDelay = 60,
}: OtpFormProps) {
  const [otp, setOtp] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [timerKey, setTimerKey] = useState(0);

  const handleOtpChange = (value: string) => {
    setOtp(value);
    // Auto-submit when all 6 digits filled
    if (value.length === 6 && !isLoading) {
      onVerify(value);
    }
  };

  const handleResend = () => {
    if (!canResend) return;
    setOtp('');
    setCanResend(false);
    setTimerKey((k) => k + 1);
    onResend();
  };

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.wrapper}>
      {/* Symbolic shield — no emoji */}
      <View style={styles.shieldIcon}>
        <View style={styles.shieldTop} />
        <View style={styles.shieldBody} />
      </View>

      {/* Heading */}
      <View style={styles.headingGroup}>
        <Text style={styles.title}>Verify your number</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to
        </Text>
        <Text style={styles.phone}>{maskedPhone}</Text>
      </View>

      {/* OTP cells */}
      <OtpInput
        value={otp}
        onChange={handleOtpChange}
        isError={isError}
        isSuccess={isSuccess}
        disabled={isLoading || isSuccess}
      />

      {/* Error message */}
      {isError && errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      {/* Verify button */}
      <PrimaryButton
        label={isSuccess ? 'Verified ✓' : 'Verify & Continue'}
        onPress={() => onVerify(otp)}
        isLoading={isLoading}
        disabled={otp.length < 6 || isSuccess}
        icon={isSuccess ? undefined : '→'}
        iconPosition="right"
      />

      {/* Resend row */}
      <View style={styles.resendRow}>
        <Text style={styles.resendLabel}>Didn't receive? Resend in </Text>
        <CountdownTimer
          seconds={resendDelay}
          resetKey={timerKey}
          onComplete={() => setCanResend(true)}
        />
        {canResend && (
          <Pressable onPress={handleResend} style={styles.resendButton}>
            <Text style={styles.resendLink}> — Resend</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.four,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  shieldIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
  },
  shieldTop: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: Brand.primaryLight,
    marginBottom: 2,
  },
  shieldBody: {
    width: 30,
    height: 18,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: Brand.primary,
    opacity: 0.85,
  },
  headingGroup: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  title: {
    color: Brand.textOnDark,
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: Brand.textOnDarkSecondary,
    fontSize: 15,
  },
  phone: {
    color: Brand.primary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  errorText: {
    color: Brand.error,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  resendLabel: {
    color: Brand.textOnDarkSecondary,
    fontSize: 14,
  },
  resendButton: {
    paddingVertical: 2,
  },
  resendLink: {
    color: Brand.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
