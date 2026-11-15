import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Typography } from '@/constants/theme';
import { errorText } from '@/features/events/lib/messages';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { TurfDeskService, TurfService, VendorTurfService } from '@/services/turf-service';
import type { CourtView, TurfRules } from '@/types/turf';
import { AddOnsEditor, PricesEditor } from '../components/PriceEditors';
import { courtDraftOf, courtErrors, toAddOns, toPrices, type CourtDraft } from '../lib/forms';

function Form({ court, rules }: { court: CourtView; rules: TurfRules }) {
  const router = useRouter();
  const token = useAuthToken();
  const [draft, setDraft] = useState<CourtDraft>(() => courtDraftOf(court));
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const errors = courtErrors(draft, rules);
  const shownErrors = shown ? errors : { peaks: {}, addOns: {} };
  const bad = !!(errors.base || errors.weekend || errors.more || Object.keys(errors.peaks).length || Object.keys(errors.addOns).length);

  const save = async () => {
    setShown(true);
    if (bad) {
      Feedback.error();
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      await TurfDeskService.prices(token, court.id, { prices: toPrices(draft), addOns: toAddOns(draft.addOns) });
      Feedback.success();
      router.back();
    } catch (e) {
      Feedback.error();
      setFailure(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer title={`Prices: ${court.name}`} footer={<PrimaryButton label="Save prices" loading={busy} onPress={save} />}>
      <Text style={styles.hint}>New prices apply to bookings made from now. Bookings already made keep what they paid.</Text>
      <PricesEditor draft={draft} errors={shownErrors} onChange={(changes) => setDraft((d) => ({ ...d, ...changes }))} />
      <AddOnsEditor addOns={draft.addOns} errors={shownErrors.addOns} max={rules.maxAddOns} onChange={(addOns) => setDraft((d) => ({ ...d, addOns }))} />
      {shownErrors.more ? <Text style={styles.error}>{shownErrors.more}</Text> : null}
      {failure ? <ErrorBanner message={failure} /> : null}
    </ScreenContainer>
  );
}

/** A court's prices and add-ons, for the owner or staff allowed to change prices. */
export function CourtPricesScreen() {
  const token = useAuthToken();
  const { id, ground } = useLocalSearchParams<{ id: string; ground: string }>();
  const rules = useAsyncResource(() => TurfService.rules(token), 'rules');
  const court = useAsyncResource(async () => {
    const desk = (await TurfDeskService.grounds(token)).find((g) => g.id === ground);
    const courts = desk?.owner ? (await VendorTurfService.get(token, ground)).courtList : (await TurfService.get(token, ground)).courtList;
    return courts.find((c) => c.id === id) ?? null;
  }, `${ground}|${id}`);
  if (rules.data && court.data) return <Form court={court.data} rules={rules.data} />;
  return (
    <ScreenContainer title="Prices">
      {rules.data && court.data === null && !court.loading ? (
        <EmptyState icon="pricetag-outline" title="Court not found" message="It may have been removed." />
      ) : (
        <AsyncBoundary
          loading={rules.loading || court.loading}
          error={rules.error ?? court.error}
          hasData={false}
          onRetry={() => {
            rules.reload();
            court.reload();
          }}
          skeletonRows={4}
        >
          {null}
        </AsyncBoundary>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hint: { ...Typography.caption, color: Brand.textMuted },
  error: { ...Typography.caption, color: Brand.error },
});
