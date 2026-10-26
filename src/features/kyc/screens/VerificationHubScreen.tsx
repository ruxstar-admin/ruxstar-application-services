import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ListRow } from '@/components/ui/ListRow';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { KYC_FLOWS } from '@/features/kyc/lib/flows';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { ROLES } from '@/constants/roles';
import { KycService } from '@/services/kyc-service';
import { useAuthStore } from '@/stores/auth-store';
import type { KycFlow, KycState, KycStatus } from '@/types/kyc';

const STATUS_BADGE: Record<KycStatus, { label: string; tone: 'neutral' | 'warning' | 'success' | 'error' }> = {
  not_started: { label: 'Not started', tone: 'neutral' },
  pending_review: { label: 'In review', tone: 'warning' },
  verified: { label: 'Verified', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'error' },
};

const ROWS: readonly { flow: KycFlow; icon: 'id-card-outline' | 'storefront-outline' | 'bicycle-outline'; blurb: string }[] = [
  { flow: 'base', icon: 'id-card-outline', blurb: 'Aadhaar, PAN, selfie and bank account' },
  { flow: 'vendor', icon: 'storefront-outline', blurb: 'GST or shop licence and a shop photo' },
  { flow: 'delivery', icon: 'bicycle-outline', blurb: 'Driving licence and vehicle details' },
];

/** All verifications and their status. Vendor and delivery unlock once core identity is verified. */
export function VerificationHubScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { data, loading, error, reload } = useAsyncResource(() => KycService.getStatus(token));

  // Refresh when coming back from a flow.
  useRefetchOnFocus(reload);

  // An approved vendor verification grants the role now, without needing a fresh sign-in.
  const addRole = useAuthStore((s) => s.addRole);
  const vendorVerified = data?.vendor.status === 'verified';
  const deliveryVerified = data?.delivery.status === 'verified';
  useEffect(() => {
    if (vendorVerified) addRole(ROLES.VENDOR);
    if (deliveryVerified) addRole(ROLES.DELIVERY);
  }, [vendorVerified, deliveryVerified, addRole]);

  const baseVerified = data?.base.status === 'verified';

  const subtitleFor = (flow: KycFlow, state: KycState, blurb: string) => {
    if (state.status === 'rejected' && state.reason) return state.reason;
    if (flow !== 'base' && !baseVerified && state.status === 'not_started') return 'Verify your identity first';
    return blurb;
  };

  return (
    <ScreenContainer title="Verification">
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={3}>
        {data
          ? ROWS.map(({ flow, icon, blurb }) => {
              const state = data[flow];
              const badge = STATUS_BADGE[state.status];
              const startable = (state.status === 'not_started' || state.status === 'rejected') && (flow === 'base' || baseVerified);
              return (
                <ListRow
                  key={flow}
                  icon={icon}
                  title={KYC_FLOWS[flow].title}
                  subtitle={subtitleFor(flow, state, blurb)}
                  right={<Badge label={badge.label} tone={badge.tone} />}
                  onPress={startable ? () => router.push({ pathname: '/(customer)/kyc/[flow]', params: { flow } }) : undefined}
                />
              );
            })
          : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}
