import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Checkbox } from '@/components/ui/Checkbox';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { KeyedSelectField } from '@/components/ui/KeyedSelectField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { StepBar } from '@/components/ui/StepBar';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { Notice } from '@/features/coaching/components/Parts';
import { errorText } from '@/features/events/lib/messages';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { IdempotentAttempt } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { FreelanceService } from '@/services/gigs-service';
import type { GigsRules, MyFreelancer, MyGig } from '@/types/gigs';
import { PackageFields } from '../components/PackageFields';
import { useGigsRules, useMyFreelancer } from '../hooks/use-gigs';
import { limitsOf } from '../lib/files';
import { emptyGig, emptyPackage, gigDraftOf, gigErrors, newQuestion, nextTier, stepOfError, toGigInput, type GigDraft, type PackageDraft, type QuestionDraft } from '../lib/forms';
import { categoryLabel } from '../lib/gigs';

const STEPS = ['About', 'Packages', 'Questions'] as const;
const STEP_KEY = ['about', 'packages', 'questions'] as const;

function Editor({ rules, me, gig }: { rules: GigsRules; me: MyFreelancer; gig: MyGig | null }) {
  const router = useRouter();
  const token = useAuthToken();
  const [draft, setDraft] = useState<GigDraft>(() =>
    gig ? gigDraftOf(gig) : emptyGig(rules.categories.some((c) => c.key === me.category) ? me.category : (rules.categories[0]?.key ?? ''), rules),
  );
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState<boolean[]>([false, false, false]);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const attempt = useRef(new IdempotentAttempt());
  const errors = gigErrors(draft, rules);
  const err = (key: string) => (shown[step] ? errors[key] : undefined);
  const stepHasErrors = (at: number) => Object.keys(errors).some((k) => stepOfError({ [k]: errors[k]! }) === STEP_KEY[at]);
  const set = <K extends keyof GigDraft>(key: K, value: GigDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setPackage = (tier: PackageDraft['tier'], patch: Partial<PackageDraft>) =>
    setDraft((d) => ({ ...d, packages: d.packages.map((p) => (p.tier === tier ? { ...p, ...patch } : p)) }));
  const setQuestion = (key: string, patch: Partial<QuestionDraft>) => setDraft((d) => ({ ...d, questions: d.questions.map((q) => (q.key === key ? { ...q, ...patch } : q)) }));
  const tier = nextTier(draft, rules.maxPackages);

  const next = () => {
    setShown((s) => s.map((v, i) => (i === step ? true : v)));
    if (stepHasErrors(step)) {
      Feedback.error();
      return;
    }
    setStep(step + 1);
  };

  const save = async () => {
    setShown([true, true, true]);
    const wrong = stepOfError(errors);
    if (wrong) {
      Feedback.error();
      setStep(STEP_KEY.indexOf(wrong));
      return;
    }
    setBusy(true);
    setFailure(null);
    const body = toGigInput(draft);
    try {
      if (gig) {
        await FreelanceService.updateGig(token, gig.id, body);
        Feedback.success();
        router.back();
      } else {
        const made = await FreelanceService.create(token, body, { idempotencyKey: attempt.current.keyFor(body) });
        attempt.current.settle();
        Feedback.success();
        router.replace({ pathname: '/(customer)/freelance/gigs/[id]', params: { id: made.id, fresh: '1' } });
      }
    } catch (e) {
      Feedback.error();
      attempt.current.settle(e);
      setFailure(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const last = step === STEPS.length - 1;
  const footer = last ? (
    <PrimaryButton label={gig ? 'Save changes' : 'Save as a draft'} loading={busy} onPress={save} />
  ) : (
    <PrimaryButton label="Continue" onPress={next} />
  );

  return (
    <ScreenContainer title={gig ? 'Edit gig' : 'New gig'} footer={footer}>
      <StepBar steps={STEPS} at={step} />
      {step > 0 ? <TextLink label="‹ Back a step" onPress={() => setStep(step - 1)} /> : null}

      {step === 0 ? (
        <>
          <InputField
            label="Title"
            value={draft.title}
            onChangeText={(v) => set('title', v)}
            maxLength={80}
            placeholder="Like “I will design a logo for your brand”"
            error={err('title')}
          />
          <KeyedSelectField
            label="Category"
            value={draft.category}
            options={rules.categories}
            onChange={(v) => set('category', v)}
            error={err('category')}
            fallback={(key) => categoryLabel(rules.categories, key)}
          />
          <InputField
            label="Description"
            value={draft.description}
            onChangeText={(v) => set('description', v)}
            multiline
            maxLength={3000}
            showCount
            placeholder="What you do, how you work, what you need from the customer"
            error={err('description')}
          />
        </>
      ) : null}

      {step === 1 ? (
        <>
          <Text style={styles.lead}>
            {rules.maxPackages > 1 ? `Up to ${Math.min(rules.maxPackages, 3)} packages, from the simplest to the fullest. Customers compare them side by side.` : 'One package: what customers get and what it costs.'}
          </Text>
          {err('packages') ? <Text style={styles.error}>{err('packages')}</Text> : null}
          {draft.packages.map((p, i) => (
            <PackageFields
              key={p.tier}
              pack={p}
              rules={rules}
              errors={shown[1] ? errors : {}}
              onChange={(patch) => setPackage(p.tier, patch)}
              onRemove={i > 0 && i === draft.packages.length - 1 ? () => set('packages', draft.packages.slice(0, -1)) : null}
            />
          ))}
          {tier ? <PrimaryButton label={`Add ${tier === 'standard' ? 'a Standard' : 'a Premium'} package`} variant="outline" onPress={() => set('packages', [...draft.packages, emptyPackage(tier, rules)])} /> : null}
          <Text style={styles.small}>{`Ruxstar keeps ${rules.commissionBps / 100}% of the price. Days count from when you accept.`}</Text>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Text style={styles.lead}>Ask what you need to start, like their brand name or the colours they like. Customers answer when they order.</Text>
          {draft.questions.map((q, i) => (
            <View key={q.key} style={styles.question}>
              <View style={styles.flex}>
                <InputField label={`Question ${i + 1}`} value={q.text} onChangeText={(v) => setQuestion(q.key, { text: v })} maxLength={200} error={err(`q.${q.key}`)} />
                <Checkbox checked={q.required} onChange={(required) => setQuestion(q.key, { required })} accessibilityLabel="They must answer">
                  <Text style={styles.small}>They must answer</Text>
                </Checkbox>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove question ${i + 1}`}
                hitSlop={10}
                onPress={() => set('questions', draft.questions.filter((x) => x.key !== q.key))}
                style={styles.remove}
              >
                <Ionicons name="close" size={20} color={Brand.textMuted} />
              </Pressable>
            </View>
          ))}
          {draft.questions.length < limitsOf(rules).questions ? <TextLink label="Add a question" onPress={() => set('questions', [...draft.questions, newQuestion()])} /> : null}
          {gig ? <Notice text="Orders already placed keep the packages and questions they were made with." /> : <Notice text="It’s saved as a draft. Add photos, then publish it." />}
        </>
      ) : null}

      {failure ? <ErrorBanner message={failure} /> : null}
    </ScreenContainer>
  );
}

/** Making a gig, or editing one (`id`): what it is, its packages, and questions for the customer. */
export function GigEditorScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const rules = useGigsRules();
  const me = useMyFreelancer();
  const gig = useAsyncResource(() => (id ? FreelanceService.gig(token, id) : Promise.resolve(null)), id ?? 'new');
  const ready = rules.data && me.data && gig.data !== undefined;

  if (ready) return <Editor rules={rules.data!} me={me.data!} gig={gig.data ?? null} />;
  return (
    <ScreenContainer title={id ? 'Edit gig' : 'New gig'}>
      {me.data === null ? <EmptyState icon="briefcase-outline" title="Start freelancing first" message="Gigs belong to your freelancer profile. Set it up from Settings." /> : null}
      <AsyncBoundary
        loading={rules.loading || me.loading || gig.loading}
        error={rules.error ?? me.error ?? gig.error}
        hasData={false}
        onRetry={() => {
          rules.reload();
          me.reload();
          gig.reload();
        }}
        skeletonRows={4}
      >
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  lead: { ...Typography.body, fontSize: 15, color: Brand.textMuted },
  small: { ...Typography.caption, color: Brand.textMuted },
  error: { ...Typography.caption, color: Brand.error },
  question: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  flex: { flex: 1, gap: Spacing.two },
  remove: { paddingTop: Spacing.five },
});
