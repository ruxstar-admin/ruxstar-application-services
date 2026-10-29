import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { ProfileService } from '@/services/profile-service';

export function SessionsScreen() {
  const token = useAuthToken();
  const { data, loading, error, reload, setData } = useAsyncResource(() => ProfileService.getSessions(token));

  const endSession = async (id: string) => {
    if (!data) return;
    const previous = data;
    setData(data.filter((session) => session.id !== id));
    try {
      await ProfileService.endSession(token, id);
      Feedback.success();
    } catch {
      Feedback.error();
      setData(previous);
    }
  };

  return (
    <ScreenContainer title="Sessions & devices">
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload}>
        {data?.map((session) => (
          <ListRow
            key={session.id}
            icon="phone-portrait-outline"
            title={session.device}
            subtitle={session.lastActive}
            right={session.current ? <Badge label="This device" tone="success" /> : undefined}
            onPress={session.current ? undefined : () => endSession(session.id)}
          />
        ))}
        {data?.length === 0 ? <EmptyState icon="phone-portrait-outline" title="No other sessions" /> : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}
