import { useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Typography } from '@/constants/theme';
import { useVendorBusinesses } from '@/features/vendor/hooks/use-vendor-businesses';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { dateKey } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import { AdminService } from '@/services/admin-service';
import { CouponService } from '@/services/coupon-service';
import { TeamCouponService } from '@/services/team-service';
import { CouponFields } from '../components/CouponFields';
import { draftErrors, emptyDraft, newCouponOf } from '../lib/coupons';

const errorText = (err: unknown) =>
  err instanceof ApiError && err.status > 0 && err.kind !== 'server' ? err.message : 'Could not reach Ruxstar. Check your connection and try again.';
const retryable = (err: unknown) => err instanceof ApiError && (err.kind === 'network' || err.kind === 'timeout');

function Form({ who, shops, placeId }: { who: 'ruxstar' | 'vendor' | 'team'; shops?: { id: string; name: string }[]; placeId?: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const [draft, setDraft] = useState(() => ({ ...emptyDraft(), businessIds: shops?.length === 1 ? [shops[0]!.id] : [] }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());
  const errors = draftErrors(draft, { creating: true, needsShops: who === 'vendor', today: dateKey(new Date()) });
  const ready = Object.keys(errors).length === 0;

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = newCouponOf(draft, who === 'vendor');
      await (who === 'ruxstar'
        ? AdminService.createCoupon(token, body, key.current)
        : who === 'team'
          ? TeamCouponService.create(token, placeId!, body, key.current)
          : CouponService.create(token, body, key.current));
      Feedback.success();
      router.back();
    } catch (err) {
      Feedback.error();
      if (!retryable(err)) key.current = newIdempotencyKey();
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer
      title="New coupon"
      footer={
        <>
          {error ? <ErrorBanner message={error} /> : null}
          <PrimaryButton label="Make coupon" onPress={create} loading={busy} disabled={!ready} />
        </>
      }
    >
      <Text style={styles.muted}>
        {who === 'ruxstar'
          ? 'Ruxstar pays for the discount, at every print shop. Shops still get their full share.'
          : who === 'team'
            ? 'It works at this shop only. The discount comes out of the shop’s share, and Ruxstar’s commission is on the price after it.'
            : 'You pay for the discount: it comes out of your share, and Ruxstar’s commission is on the price after it.'}
      </Text>
      <CouponFields draft={draft} onChange={setDraft} errors={errors} creating canMoveStart shops={shops} />
    </ScreenContainer>
  );
}

function VendorForm() {
  const router = useRouter();
  const businesses = useVendorBusinesses();
  const shops = (businesses.data ?? []).filter((b) => b.module === 'pod').map((b) => ({ id: b.id, name: b.name }));
  if (businesses.data && !shops.length) {
    return (
      <ScreenContainer title="New coupon">
        <EmptyState icon="pricetag-outline" title="No print shop yet" message="Coupons work on print orders. Add a print shop first." actionLabel="Go back" onAction={() => router.back()} />
      </ScreenContainer>
    );
  }
  if (businesses.data) return <Form who="vendor" shops={shops} />;
  return (
    <ScreenContainer title="New coupon">
      <AsyncBoundary loading={businesses.loading} error={businesses.error} hasData={false} onRetry={businesses.reload} skeletonRows={5}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

/** Making a coupon: Ruxstar's from the console, a vendor's for their own print shops, or one shop's from Work (`placeId`). */
export function NewCouponScreen({ who, placeId }: { who: 'ruxstar' | 'vendor' | 'team'; placeId?: string }) {
  return who === 'vendor' ? <VendorForm /> : who === 'team' ? <Form who="team" placeId={placeId} /> : <Form who="ruxstar" />;
}

const styles = StyleSheet.create({
  muted: { ...Typography.caption, color: Brand.textMuted },
});
