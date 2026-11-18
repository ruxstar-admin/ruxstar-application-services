import { useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Typography } from '@/constants/theme';
import { Fact, Facts } from '@/features/coaching/components/Parts';
import { errorText } from '@/features/events/lib/messages';
import { useAuthToken } from '@/hooks/use-auth-token';
import { IdempotentAttempt } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { FreelanceService } from '@/services/gigs-service';
import { useAuthStore } from '@/stores/auth-store';
import type { GigsRules } from '@/types/gigs';
import { ProfileFields } from '../components/ProfileFields';
import { freelancerStarted, useGigsRules } from '../hooks/use-gigs';
import { emptyProfile, profileErrors, toProfileInput, type ProfileDraft } from '../lib/forms';

function StartForm({ rules }: { rules: GigsRules }) {
  const router = useRouter();
  const token = useAuthToken();
  const myName = useAuthStore((s) => s.name);
  const [draft, setDraft] = useState<ProfileDraft>(() => emptyProfile(myName ?? '', rules.categories[0]?.key ?? ''));
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const attempt = useRef(new IdempotentAttempt());
  const errors = profileErrors(draft);
  const set = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const start = async () => {
    setShown(true);
    if (Object.keys(errors).length) {
      Feedback.error();
      return;
    }
    setBusy(true);
    setFailure(null);
    const body = toProfileInput(draft);
    try {
      await FreelanceService.start(token, body, { idempotencyKey: attempt.current.keyFor(body) });
      attempt.current.settle();
      freelancerStarted();
      Feedback.success();
      router.replace({ pathname: '/(customer)/freelance', params: { fresh: '1' } });
    } catch (err) {
      Feedback.error();
      attempt.current.settle(err);
      setFailure(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer title="Start freelancing" footer={<PrimaryButton label="Create my profile" loading={busy} onPress={start} />}>
      <Facts>
        <Fact icon="briefcase-outline" title="Sell your skills as gigs" detail={`Up to ${rules.maxGigs} gigs, each with up to ${rules.maxPackages} packages.`} />
        <Fact icon="shield-checkmark-outline" title="Ruxstar holds the money" detail="Customers pay up front. You’re paid once they approve, or by itself after a few days." />
        <Fact icon="pie-chart-outline" title={`Ruxstar keeps ${rules.commissionBps / 100}%`} detail="Of each order’s price. You see what you get on every order." />
      </Facts>
      <Text style={styles.hint}>You can sell once your identity is verified. Set up your profile now and verify after.</Text>
      <ProfileFields draft={draft} set={set} errors={shown ? errors : {}} categories={rules.categories} />
      {failure ? <ErrorBanner message={failure} /> : null}
    </ScreenContainer>
  );
}

/** Making your freelancer profile: who you are and what you do. Verifying and gigs come after. */
export function StartFreelancingScreen() {
  const rules = useGigsRules();
  if (rules.data && rules.data.live && rules.data.signupsOpen) return <StartForm rules={rules.data} />;
  return (
    <ScreenContainer title="Start freelancing">
      {rules.data ? (
        <EmptyState icon="briefcase-outline" title="Not taking new freelancers yet" message="Ruxstar opens freelancing to new people soon. Check back later." />
      ) : (
        <AsyncBoundary loading={rules.loading} error={rules.error} hasData={false} onRetry={rules.reload} skeletonRows={4}>
          {null}
        </AsyncBoundary>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hint: { ...Typography.caption, color: Brand.textMuted },
});
