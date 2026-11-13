import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { TeamService } from '@/services/team-service';
import { MemberRow } from '../components/MemberRow';

/** The owner's team at one print shop: who works there, who is invited, and what each may do. */
export function TeamScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => TeamService.get(token, id), id);
  useRefetchOnFocus(reload);
  const full = !!data && data.members.length >= data.max;

  return (
    <ScreenContainer
      title="Team"
      footer={
        data ? (
          <PrimaryButton
            label={full ? `Team is full (${data.max})` : 'Invite someone'}
            disabled={full}
            onPress={() => router.push({ pathname: '/(vendor)/businesses/[id]/team/invite', params: { id } })}
          />
        ) : null
      }
    >
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={4}>
        {data ? (
          <>
            <Text style={styles.muted}>
              Invite people by their Ruxstar username and choose what each can do. Nothing works for them until their identity verification
              (Aadhaar, PAN and a selfie) is approved.
            </Text>
            {data.members.length ? (
              <>
                <Text style={styles.count}>
                  {data.members.length} of {data.max} places used, invites included
                </Text>
                <View style={styles.card}>
                  {data.members.map((m) => (
                    <MemberRow
                      key={m.id}
                      member={m}
                      catalog={data.permissions}
                      onPress={() => router.push({ pathname: '/(vendor)/businesses/[id]/team/[memberId]', params: { id, memberId: m.id } })}
                    />
                  ))}
                </View>
              </>
            ) : (
              <EmptyState icon="people-outline" title="No one yet" message="Invite someone to help with orders, the shop or posts." />
            )}
          </>
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  muted: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  count: { ...Typography.caption, color: Brand.textMuted, marginTop: Spacing.two },
  card: { borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border, backgroundColor: Brand.surface, paddingHorizontal: Spacing.three },
});
