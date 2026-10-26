import { StyleSheet, Text, View } from 'react-native';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { ProfileService } from '@/services/profile-service';

export function BlockedUsersScreen() {
  const token = useAuthToken();
  const { data, loading, error, reload, setData } = useAsyncResource(() => ProfileService.getBlocked(token));

  const unblock = async (userId: string) => {
    if (!data) return;
    const previous = data;
    setData(data.filter((user) => user.id !== userId));
    try {
      await ProfileService.unblock(token, userId);
      Feedback.success();
    } catch {
      Feedback.error();
      setData(previous);
    }
  };

  return (
    <ScreenContainer title="Blocked users">
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload}>
        {data?.map((user) => (
          <View key={user.id} style={styles.row}>
            <Avatar name={user.name} size={44} />
            <View style={styles.text}>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.username}>@{user.username}</Text>
            </View>
            <Chip label="Unblock" onPress={() => unblock(user.id)} />
          </View>
        ))}
        {data?.length === 0 ? (
          <EmptyState icon="happy-outline" title="No blocked users" message="People you block cannot message you or see your posts." />
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  text: { flex: 1 },
  name: { ...Typography.body, color: Brand.text },
  username: { ...Typography.caption, color: Brand.textMuted },
});
