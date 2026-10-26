import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { FieldsStep } from '@/features/kyc/components/FieldsStep';
import { KycProgress } from '@/features/kyc/components/KycProgress';
import { PhotoStep } from '@/features/kyc/components/PhotoStep';
import { ReviewStep } from '@/features/kyc/components/ReviewStep';
import { OtpStep } from '@/features/kyc/components/OtpStep';
import { OTP_ANSWER, useKycFlow } from '@/features/kyc/hooks/use-kyc-flow';
import { KYC_FLOWS, type StepDef } from '@/features/kyc/lib/flows';
import { OTP_LENGTH } from '@/features/auth/lib/validators';
import { Feedback } from '@/lib/haptics';
import type { KycFlow } from '@/types/kyc';

const canContinue = (step: StepDef, answers: Record<string, string>) => {
  switch (step.kind) {
    case 'fields':
      return step.fields.every((field) => field.isValid(answers[field.key] ?? ''));
    case 'otp':
      return (answers[OTP_ANSWER] ?? '').length === OTP_LENGTH;
    case 'photo':
      return !!answers[step.id];
    case 'review':
      return true;
  }
};

function Submitted({ title, message, onDone }: { title: string; message: string; onDone: () => void }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.doneBody}>
        <View style={styles.doneIcon}>
          <Ionicons name="checkmark" size={32} color={Brand.text} />
        </View>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={[styles.stepSubtitle, styles.centered]}>{message}</Text>
      </View>
      <View style={styles.footer}>
        <PrimaryButton label="Back to Ruxstar" onPress={onDone} />
      </View>
    </SafeAreaView>
  );
}

/** One screen for all three verification flows; the step index is local state and each step slides in. */
export function KycFlowScreen() {
  const router = useRouter();
  const { flow: flowParam } = useLocalSearchParams<{ flow: KycFlow }>();
  const flow = KYC_FLOWS[flowParam] ?? KYC_FLOWS.base;
  const kyc = useKycFlow(flow);
  const { step, answers } = kyc;

  if (kyc.submitted) return <Submitted title={flow.doneTitle} message={flow.doneMessage} onDone={() => router.back()} />;

  const goBack = () => {
    Feedback.tap();
    if (!kyc.back()) router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={12} onPress={goBack}>
            <Ionicons name="arrow-back" size={26} color={Brand.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{flow.title}</Text>
            <Text style={styles.headerStep}>{`Step ${kyc.index + 1} of ${kyc.total}`}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={Brand.textMuted} />
          </Pressable>
        </View>

        <View style={styles.progress}>
          <KycProgress index={kyc.index} total={kyc.total} />
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View key={step.id} entering={FadeInRight.duration(250)} style={styles.step}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepSubtitle}>{step.subtitle}</Text>

            {step.kind === 'fields' ? <FieldsStep fields={step.fields} answers={answers} onChange={kyc.setAnswer} /> : null}
            {step.kind === 'otp' ? (
              <OtpStep value={answers[OTP_ANSWER] ?? ''} onChange={(value) => kyc.setAnswer(OTP_ANSWER, value)} hasError={!!kyc.error} />
            ) : null}
            {step.kind === 'photo' ? (
              <PhotoStep uri={answers[step.id]} hint={step.hint} camera={step.camera} onPicked={(uri) => kyc.setAnswer(step.id, uri)} />
            ) : null}
            {step.kind === 'review' ? <ReviewStep rows={step.rows(answers)} /> : null}

            {kyc.error ? <ErrorBanner message={kyc.error} onRetry={kyc.next} /> : null}
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label={step.kind === 'review' ? 'Submit for verification' : 'Continue'}
            onPress={kyc.next}
            disabled={!canContinue(step, answers)}
            loading={kyc.busy}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  headerText: { flex: 1 },
  headerTitle: { ...Typography.bodyStrong, color: Brand.text },
  headerStep: { ...Typography.caption, color: Brand.textMuted },
  progress: { paddingHorizontal: Spacing.three },
  body: { paddingHorizontal: Spacing.three, paddingTop: Spacing.four, paddingBottom: Spacing.four },
  step: { gap: Spacing.three },
  stepTitle: { ...Typography.title, color: Brand.text },
  stepSubtitle: { ...Typography.body, color: Brand.textMuted },
  centered: { textAlign: 'center' },
  footer: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, paddingTop: Spacing.two },
  doneBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.four, gap: Spacing.three },
  doneIcon: { width: 72, height: 72, borderRadius: Radius.pill, backgroundColor: Brand.success, alignItems: 'center', justifyContent: 'center' },
});
