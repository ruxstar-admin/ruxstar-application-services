import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { ProfileService } from '@/services/profile-service';
import type { NotificationPrefs } from '@/types/profile';

const ROWS: readonly { key: keyof NotificationPrefs; title: string; subtitle: string }[] = [
  { key: 'orders', title: 'Orders & deliveries', subtitle: 'Status changes on what you buy or sell' },
  { key: 'messages', title: 'Messages', subtitle: 'Direct messages and group chats' },
  { key: 'social', title: 'Likes & comments', subtitle: 'Activity on your posts' },
  { key: 'work', title: 'Work & offers', subtitle: 'Employment offers and shift reminders' },
  { key: 'digest', title: 'Weekly digest', subtitle: 'A Sunday summary of your community' },
];

export function NotificationPrefsScreen() {
  const token = useAuthToken();
  const { data, loading, error, reload, setData } = useAsyncResource(() => ProfileService.getNotificationPrefs(token));

  // Optimistic: flip immediately, roll back if saving fails.
  const toggle = async (key: keyof NotificationPrefs, value: boolean) => {
    if (!data) return;
    setData({ ...data, [key]: value });
    try {
      await ProfileService.setNotificationPrefs(token, { [key]: value });
    } catch {
      Feedback.error();
      setData(data);
    }
  };

  return (
    <ScreenContainer title="Notification preferences">
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={5}>
        {data
          ? ROWS.map((row) => (
              <ToggleRow key={row.key} title={row.title} subtitle={row.subtitle} value={data[row.key]} onValueChange={(value) => toggle(row.key, value)} />
            ))
          : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}
