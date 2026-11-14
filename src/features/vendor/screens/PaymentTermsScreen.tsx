import { StyleSheet, Text } from 'react-native';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Typography } from '@/constants/theme';
import { PaymentTerms } from '@/features/pod/components/PaymentTerms';
import { vendorTerms } from '@/features/pod/lib/terms';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ShopService } from '@/services/shop-service';

/** The payment terms a print shop agreed to when it was created, as Ruxstar has them set now. */
export function PaymentTermsScreen() {
  const token = useAuthToken();
  const { data, loading, error, reload } = useAsyncResource(() => ShopService.terms(token));

  return (
    <ScreenContainer title="Payment terms">
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={4}>
        {data ? (
          <>
            <Text style={styles.intro}>How print orders are paid, refunded and paid out to you, with Ruxstar&apos;s current commission and fees.</Text>
            <PaymentTerms terms={vendorTerms(data)} />
          </>
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  intro: { ...Typography.body, color: Brand.textMuted },
});
