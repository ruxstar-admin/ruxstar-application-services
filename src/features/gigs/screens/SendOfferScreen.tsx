import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { KeyedSelectField } from '@/components/ui/KeyedSelectField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { errorText } from '@/features/events/lib/messages';
import { money, rupeeInput } from '@/features/vendor/lib/pod';
import { useAuthToken } from '@/hooks/use-auth-token';
import { IdempotentAttempt } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { ChatService } from '@/services/chat-service';
import type { GigsRules, MyFreelancer } from '@/types/gigs';
import { useGigsRules, useMyFreelancer } from '../hooks/use-gigs';
import { emptyQuote, quoteErrors, toQuoteInput, type QuoteDraft } from '../lib/forms';
import { priceRangeText } from '../lib/gigs';

function Form({ rules, me, chatId, name }: { rules: GigsRules; me: MyFreelancer; chatId: string; name: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const [draft, setDraft] = useState<QuoteDraft>(() => emptyQuote(rules.categories.some((c) => c.key === me.category) ? me.category : (rules.categories[0]?.key ?? ''), rules));
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const attempt = useRef(new IdempotentAttempt());
  const errors = quoteErrors(draft, rules);
  const err = (field: string) => (shown ? errors[field] : undefined);
  const set = <K extends keyof QuoteDraft>(key: K, value: QuoteDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const send = async () => {
    setShown(true);
    if (Object.keys(errors).length) {
      Feedback.error();
      return;
    }
    setBusy(true);
    setFailure(null);
    const body = toQuoteInput(draft);
    try {
      await ChatService.sendQuote(token, chatId, body, attempt.current.keyFor(body));
      attempt.current.settle();
      Feedback.success();
      router.back();
    } catch (e) {
      Feedback.error();
      attempt.current.settle(e);
      setFailure(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const footer = <PrimaryButton label="Send offer" loading={busy} onPress={send} />;

  return (
    <ScreenContainer title={name ? `Offer for ${name}` : 'Send an offer'} footer={footer}>
      <Text style={styles.hint}>{`Write exactly what you’ll deliver. ${name || 'They'} can pay for it in the chat for ${rules.quoteDays} day${rules.quoteDays === 1 ? '' : 's'}, and the work starts once they pay.`}</Text>
      <InputField label="Title" value={draft.title} onChangeText={(v) => set('title', v)} maxLength={80} placeholder="Like “Logo and 3 social posts”" error={err('title')} />
      <InputField
        label="What’s included"
        value={draft.description}
        onChangeText={(v) => set('description', v)}
        multiline
        maxLength={1200}
        showCount
        placeholder="What you’ll make, the files they get, what you need from them"
        error={err('description')}
      />
      <KeyedSelectField label="Category" value={draft.category} options={rules.categories} onChange={(v) => set('category', v)} error={err('category')} />
      <InputField
        label="Price (₹)"
        value={draft.price}
        onChangeText={(v) => set('price', rupeeInput(v))}
        keyboardType="decimal-pad"
        hint={priceRangeText(rules.minPrice, rules.maxPrice)}
        error={err('price')}
      />
      <View style={styles.pair}>
        <View style={styles.half}>
          <InputField label="Days to deliver" value={draft.deliveryDays} onChangeText={(v) => set('deliveryDays', v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={3} error={err('deliveryDays')} />
        </View>
        <View style={styles.half}>
          <InputField label="Revisions" value={draft.revisions} onChangeText={(v) => set('revisions', v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={2} error={err('revisions')} />
        </View>
      </View>
      <Text style={styles.hint}>
        {`Days count from when they pay. Ruxstar keeps ${rules.commissionBps / 100}% of the price.${rules.platformFee ? ` They also pay a ${money(rules.platformFee)} platform fee.` : ''}`}
      </Text>
      {failure ? <ErrorBanner message={failure} /> : null}
    </ScreenContainer>
  );
}

/** A verified freelancer's custom offer, sent into a 1:1 chat (`chat`), to `name`. */
export function SendOfferScreen() {
  const { chat, name } = useLocalSearchParams<{ chat: string; name?: string }>();
  const rules = useGigsRules();
  const me = useMyFreelancer();
  const ready = rules.data && me.data;
  if (ready) return <Form rules={rules.data!} me={me.data!} chatId={chat} name={name ?? ''} />;
  if (me.data === null) {
    return (
      <ScreenContainer title="Send an offer">
        <EmptyState icon="briefcase-outline" title="Start freelancing first" message="Offers come from your freelancer profile. Set it up from Settings." />
      </ScreenContainer>
    );
  }
  return (
    <ScreenContainer title="Send an offer">
      <AsyncBoundary
        loading={rules.loading || me.loading}
        error={rules.error ?? me.error}
        hasData={false}
        onRetry={() => {
          rules.reload();
          me.reload();
        }}
        skeletonRows={4}
      >
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hint: { ...Typography.caption, color: Brand.textMuted },
  pair: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
});
