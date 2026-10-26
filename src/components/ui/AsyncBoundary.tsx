import { StyleSheet, View } from 'react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spacing } from '@/constants/theme';

interface AsyncBoundaryProps {
  loading: boolean;
  error: unknown;
  /** True once there is something to show; a reload keeps showing it instead of flashing skeletons. */
  hasData: boolean;
  onRetry: () => void;
  skeletonRows?: number;
  children: React.ReactNode;
}

/** The one place loading and failure are rendered for fetched screens: skeleton, error with retry, or content. */
export function AsyncBoundary({ loading, error, hasData, onRetry, skeletonRows = 4, children }: AsyncBoundaryProps) {
  if (hasData) return <>{children}</>;

  if (error) {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        title="Could not load this"
        message="Check your connection and try again."
        actionLabel="Try again"
        onAction={onRetry}
      />
    );
  }

  if (!loading) return <>{children}</>;

  return (
    <View style={styles.skeletons} accessibilityLabel="Loading">
      {Array.from({ length: skeletonRows }, (_, i) => (
        <Skeleton key={i} height={56} radius={14} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeletons: { gap: Spacing.three, paddingTop: Spacing.three },
});
