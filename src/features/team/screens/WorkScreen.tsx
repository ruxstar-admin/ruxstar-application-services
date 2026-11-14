import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { WorkService } from '@/services/team-service';
import { InviteCard } from '../components/InviteCard';
import { ACCESS, payLine, permissionsLine } from '../lib/team';

/** The Work area: team invites, and the businesses you help run. */
export function WorkScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { data, loading, error, reload } = useAsyncResource(() => WorkService.get(token));
  useRefetchOnFocus(reload);
  const [note, setNote] = useState<string | null>(null);

  return (
    <ScreenContainer title="Work">
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={4}>
        {data ? (
          data.invites.length || data.places.length ? (
            <>
              {note ? <Text style={styles.note}>{note}</Text> : null}
              {data.invites.length ? (
                <>
                  <Text style={styles.section}>{data.invites.length === 1 ? 'Job offer' : `${data.invites.length} job offers`}</Text>
                  {data.invites.length > 1 ? (
                    <Text style={styles.hint}>Compare the pay and what you&apos;d do at each. You can accept more than one.</Text>
                  ) : null}
                  {data.invites.map((invite) => (
                    <InviteCard
                      key={invite.id}
                      invite={invite}
                      catalog={data.permissions}
                      onAnswered={(accepted) => {
                        setNote(accepted ? `You joined ${invite.business.name}'s team.` : 'Invite declined.');
                        reload();
                      }}
                    />
                  ))}
                </>
              ) : null}
              {data.places.length ? (
                <>
                  <Text style={styles.section}>Where you work</Text>
                  <View style={styles.card}>
                    {data.places.map((place) => {
                      const access = ACCESS[place.access];
                      return (
                        <ListRow
                          key={place.id}
                          leading={<Avatar name={place.business.name} uri={place.business.photo ?? undefined} size={40} />}
                          title={place.business.name}
                          subtitle={[payLine(place.pay), permissionsLine(data.permissions, place.permissions)].filter(Boolean).join(' · ')}
                          right={<Badge label={access.label} tone={access.tone} />}
                          onPress={() => router.push({ pathname: '/(customer)/work/[id]', params: { id: place.id } })}
                        />
                      );
                    })}
                  </View>
                </>
              ) : null}
            </>
          ) : (
            <EmptyState icon="briefcase-outline" title="No teams yet" message="When a business owner invites you by your username, it shows up here." />
          )
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: { ...Typography.bodyStrong, color: Brand.text, marginTop: Spacing.three },
  note: { ...Typography.caption, fontSize: 14, color: Brand.success },
  hint: { ...Typography.caption, color: Brand.textMuted },
  card: { borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border, backgroundColor: Brand.surface, paddingHorizontal: Spacing.three },
});
