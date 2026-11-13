import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { WorkService } from '@/services/team-service';
import type { PermissionInfo, TeamPermission, WorkBusiness, WorkPlace } from '@/types/team';
import { InviteCard } from '../components/InviteCard';
import { ACCESS } from '../lib/team';

const has = (...wanted: TeamPermission[]) => (permissions: TeamPermission[]) => wanted.some((p) => permissions.includes(p));

/** What someone can open at a business they work at, by what the owner allowed. */
const WORK_AREAS: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  allowed: (permissions: TeamPermission[]) => boolean;
  href: (place: WorkPlace) => Href;
}[] = [
  {
    title: 'Orders',
    subtitle: 'New orders, ones being made, and past ones',
    icon: 'receipt-outline',
    allowed: has('orders.view'),
    href: (p) => ({ pathname: '/(customer)/work/orders/[id]', params: { id: p.id, name: p.business.name } }),
  },
  {
    title: 'Shop',
    subtitle: 'Open or close it, and change what you’re allowed to',
    icon: 'storefront-outline',
    allowed: has('shop.open', 'shop.catalog', 'shop.details'),
    href: (p) => ({ pathname: '/(customer)/work/shop/[id]', params: { id: p.id } }),
  },
  {
    title: 'Coupons',
    subtitle: 'Discounts for this shop',
    icon: 'pricetag-outline',
    allowed: has('coupons.manage'),
    href: (p) => ({ pathname: '/(customer)/work/coupons/[id]', params: { id: p.id } }),
  },
  {
    title: 'Reviews',
    subtitle: 'What customers said, and the shop’s replies',
    icon: 'star-outline',
    allowed: has('reviews.reply'),
    href: (p) => ({ pathname: '/(customer)/work/reviews/[id]', params: { id: p.id, name: p.business.name } }),
  },
  {
    title: 'Post as the business',
    subtitle: 'It goes out under the owner’s name',
    icon: 'create-outline',
    allowed: has('posts.create'),
    href: (p) => ({ pathname: '/(customer)/create-post', params: { kind: 'business', businessId: p.business.id, teamOf: p.business.name } }),
  },
];

const errorText = (err: unknown) =>
  err instanceof ApiError && err.status > 0 && err.kind !== 'server' ? err.message : 'Could not reach Ruxstar. Check your connection and try again.';

function Head({ business, owner }: { business: WorkBusiness; owner: string }) {
  return (
    <View style={styles.head}>
      <Avatar name={business.name} uri={business.photo ?? undefined} size={56} />
      <View style={styles.headText}>
        <Text style={styles.name}>{business.name}</Text>
        <Text style={styles.muted}>
          Owned by {owner}
          {business.city ? ` · ${business.city}` : ''}
        </Text>
      </View>
    </View>
  );
}

function Allowed({ catalog, permissions }: { catalog: PermissionInfo[]; permissions: TeamPermission[] }) {
  return (
    <View style={styles.card}>
      {catalog
        .filter((p) => permissions.includes(p.key))
        .map((p) => (
          <View key={p.key} style={styles.allowed}>
            <Ionicons name="checkmark-circle" size={20} color={Brand.success} />
            <Text style={styles.body}>{p.label}</Text>
          </View>
        ))}
    </View>
  );
}

/** One business you work at, or an invite to one (notifications link here with the same id). */
export function WorkPlaceScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => WorkService.get(token), id);
  useRefetchOnFocus(reload);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const place = data?.places.find((p) => p.id === id);
  const invite = data?.invites.find((i) => i.id === id);

  const leave = async () => {
    setBusy(true);
    setFailure(null);
    try {
      await WorkService.leave(token, id);
      Feedback.success();
      setConfirming(false);
      router.back();
    } catch (err) {
      Feedback.error();
      setConfirming(false);
      setFailure(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const access = place ? ACCESS[place.access] : null;
  return (
    <ScreenContainer title={invite ? 'Team invite' : 'Work'}>
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={4}>
        {data && place && access ? (
          <>
            <Head business={place.business} owner={place.owner.name} />
            <View style={styles.row}>
              <Badge label={access.label} tone={access.tone} />
            </View>
            {access.note ? <Text style={styles.muted}>{access.note}</Text> : null}
            {place.access === 'verify' ? (
              <PrimaryButton label="Get verified" onPress={() => router.push('/(customer)/settings/verification')} />
            ) : null}
            {place.access === 'on' && WORK_AREAS.some((a) => a.allowed(place.permissions)) ? (
              <View style={styles.card}>
                {WORK_AREAS.filter((a) => a.allowed(place.permissions)).map((a) => (
                  <ListRow key={a.title} icon={a.icon} title={a.title} subtitle={a.subtitle} onPress={() => router.push(a.href(place))} />
                ))}
              </View>
            ) : null}
            <Text style={styles.section}>What you can do</Text>
            <Allowed catalog={data.permissions} permissions={place.permissions} />
            <Text style={styles.muted}>The owner chooses these and can change them at any time.</Text>
            {failure ? <ErrorBanner message={failure} /> : null}
            <View style={styles.leave}>
              <TextLink muted label="Leave this team" onPress={() => setConfirming(true)} />
            </View>
            <ConfirmSheet
              visible={confirming}
              title={`Leave ${place.business.name}?`}
              message="Your access ends at once and the owner is told. They'd need to invite you again."
              confirmLabel="Leave"
              loading={busy}
              onConfirm={leave}
              onCancel={() => setConfirming(false)}
            />
          </>
        ) : data && invite ? (
          <>
            <InviteCard
              invite={invite}
              catalog={data.permissions}
              onAnswered={(accepted) => (accepted ? reload() : router.back())}
            />
            <Text style={styles.section}>What you&apos;d be able to do</Text>
            <Allowed catalog={data.permissions} permissions={invite.permissions} />
          </>
        ) : (
          <EmptyState
            icon="briefcase-outline"
            title="Not open any more"
            message="This invite ran out or was cancelled, or you're no longer on this team."
            actionLabel="Open Work"
            onAction={() => router.replace('/(customer)/work')}
          />
        )}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  headText: { flex: 1, gap: 2 },
  name: { ...Typography.title, color: Brand.text },
  muted: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  body: { ...Typography.body, color: Brand.text, flex: 1 },
  row: { flexDirection: 'row' },
  section: { ...Typography.bodyStrong, color: Brand.text, marginTop: Spacing.three },
  card: { borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border, backgroundColor: Brand.surface, padding: Spacing.three, gap: Spacing.three },
  allowed: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  leave: { alignItems: 'flex-start', marginTop: Spacing.three },
});
