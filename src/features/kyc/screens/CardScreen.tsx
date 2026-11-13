import { StyleSheet, Text, View } from 'react-native';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { RuxstarCard } from '@/features/kyc/components/RuxstarCard';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { KycService } from '@/services/kyc-service';

/** The vendor's Ruxstar Card on its own, from the portal's Dashboard. Every vendor has one, since identity approval opens the portal. */
export function CardScreen() {
  const token = useAuthToken();
  const { data, loading, error, reload } = useAsyncResource(() => KycService.getCard(token));

  return (
    <ScreenContainer title="Ruxstar Card">
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={3}>
        {data ? (
          <View style={styles.wrap}>
            <RuxstarCard card={data} />
            <Text style={styles.muted}>Tap the card to turn it over.</Text>
            <Text style={styles.muted}>Only you can see your masked Aadhaar and PAN. Others see the Verified tick on your profile and posts.</Text>
          </View>
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },
  muted: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
});
