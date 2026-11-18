import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ROLES } from '@/constants/roles';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Card, Notice, Section } from '@/features/coaching/components/Parts';
import { useSalesInvoicePaths } from '@/features/invoices/lib/routes';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { formatDay } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import { FreelanceService } from '@/services/gigs-service';
import { useAuthStore } from '@/stores/auth-store';
import type { GigsRules, MyFreelancer, MyGig } from '@/types/gigs';
import { useGigsRules, useMyFreelancer } from '../hooks/use-gigs';
import { GIG_STATUS, cardPriceLine } from '../lib/gigs';

function GigRow({ gig, onPress }: { gig: MyGig; onPress: () => void }) {
  const status = GIG_STATUS[gig.status];
  const line = [gig.packages.length ? cardPriceLine(gig) : 'No packages yet', gig.orders ? `${gig.orders} order${gig.orders === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${gig.title}, ${status.label}, ${line}`}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.gig, pressed && styles.pressed]}
    >
      <View style={styles.flex}>
        <Text style={styles.strong} numberOfLines={2}>
          {gig.title}
        </Text>
        <Text style={styles.small}>{line}</Text>
      </View>
      <Badge label={status.label} tone={status.tone} />
    </Pressable>
  );
}

function Home({ me, rules, fresh }: { me: MyFreelancer; rules: GigsRules; fresh: boolean }) {
  const router = useRouter();
  const token = useAuthToken();
  const vendor = useAuthStore((s) => s.roles.includes(ROLES.VENDOR));
  const invoices = useSalesInvoicePaths();
  const gigs = useAsyncResource(() => FreelanceService.gigs(token).then((p) => p.items), 'gigs');
  const reloadGigs = gigs.reload;
  useRefetchOnFocus(useCallback(() => reloadGigs(), [reloadGigs]));
  const room = me.gigs.total < me.gigs.max;
  const verify = () => router.push('/(customer)/settings/verification');

  return (
    <ScreenContainer
      title="Freelancing"
      footer={room && !me.suspended ? <PrimaryButton label="New gig" onPress={() => router.push('/(customer)/freelance/gigs/new')} /> : null}
    >
      {fresh ? <Notice tone="success" text="Your profile is ready. Verify your identity, then add your first gig." /> : null}
      <View style={styles.head}>
        <Avatar name={me.name} uri={me.avatarUrl ?? undefined} size={56} />
        <View style={styles.flex}>
          <Text style={styles.title}>{me.name}</Text>
          <Text style={styles.small}>{me.headline}</Text>
        </View>
        <Badge label={me.status === 'live' ? 'Live' : 'Not live yet'} tone={me.status === 'live' ? 'success' : 'neutral'} />
      </View>

      {me.suspended ? (
        <Card>
          <Notice tone="error" text={me.hold ? `Ruxstar put your freelancing on hold on ${formatDay(me.hold.at)}.` : 'Ruxstar has put your freelancing on hold.'} />
          {me.hold ? <Text style={styles.strong}>{`Reason: ${me.hold.reason}`}</Text> : null}
          <Text style={styles.small}>Your gigs and profile are hidden and you can’t take new orders. Contact Ruxstar support to sort it out.</Text>
          <PrimaryButton label="Contact support" variant="outline" onPress={() => router.push('/(customer)/support/new')} />
        </Card>
      ) : null}
      {!me.verified ? (
        <Card>
          <Text style={styles.strong}>Verify your identity</Text>
          <Text style={styles.small}>You need it to publish gigs and send offers. It takes a few minutes.</Text>
          <PrimaryButton label="Verify now" variant="outline" onPress={verify} />
        </Card>
      ) : null}

      <View style={styles.rows}>
        <ListRow icon="file-tray-full-outline" title="Orders" subtitle="Accept, deliver and follow your orders" onPress={() => router.push('/(customer)/freelance/orders')} />
        <ListRow icon="person-outline" title="Profile and portfolio" subtitle="What customers see about you" onPress={() => router.push('/(customer)/freelance/profile')} />
        <ListRow icon="eye-outline" title="See your page" subtitle="As customers see it" onPress={() => router.push({ pathname: '/(customer)/gigs/freelancer/[id]', params: { id: me.businessId } })} />
      </View>

      <Section title={`Your gigs (${me.gigs.total} of ${me.gigs.max})`} />
      <AsyncBoundary loading={gigs.loading && !gigs.data} error={gigs.error} hasData={!!gigs.data} onRetry={gigs.reload} skeletonRows={2}>
        {gigs.data?.length ? (
          gigs.data.map((g) => <GigRow key={g.id} gig={g} onPress={() => router.push({ pathname: '/(customer)/freelance/gigs/[id]', params: { id: g.id } })} />)
        ) : (
          <EmptyState icon="briefcase-outline" title="No gigs yet" message="A gig is a service you sell with up to three packages, like Basic, Standard and Premium." />
        )}
      </AsyncBoundary>

      <Section title="Earnings" />
      <Card>
        <Text style={styles.small}>
          {`You get each order’s price, less your own coupons${rules.commissionBps ? ` and Ruxstar’s ${rules.commissionBps / 100}%` : ''}. It’s held until the customer approves, or ${rules.autoCompleteDays} days after you deliver, then it’s yours to withdraw.`}
        </Text>
      </Card>
      <View style={styles.rows}>
        <ListRow
          icon="wallet-outline"
          title="Payments and withdrawals"
          subtitle="Your balance, where you get paid, and withdrawing"
          onPress={() => router.push(vendor ? '/(vendor)/(tabs)/payments' : '/(customer)/freelance/payments')}
        />
        <ListRow icon="document-text-outline" title="GST invoices" subtitle="Invoices and credit notes for your orders" onPress={() => router.push(invoices.list)} />
        <ListRow
          icon="pricetag-outline"
          title="Coupons"
          subtitle="Discounts you give on your gigs and offers"
          onPress={() => router.push(vendor ? '/(vendor)/coupons' : '/(customer)/freelance/coupons')}
        />
      </View>
    </ScreenContainer>
  );
}

function Intro({ rules }: { rules: GigsRules }) {
  const router = useRouter();
  const open = rules.live && rules.signupsOpen;
  return (
    <ScreenContainer title="Freelancing" footer={open ? <PrimaryButton label="Get started" onPress={() => router.push('/(customer)/freelance/start')} /> : null}>
      <EmptyState
        icon="briefcase-outline"
        title={open ? 'Sell your skills on Ruxstar' : 'Freelancing opens soon'}
        message={open ? 'Make gigs people can order, send custom offers in chat, and get paid once they approve the work.' : 'Ruxstar isn’t taking new freelancers yet. Check back later.'}
      />
    </ScreenContainer>
  );
}

/** Your freelancing: profile, verification, your gigs, orders and how you're paid. Before you start, what it is. */
export function FreelanceHomeScreen() {
  const { fresh } = useLocalSearchParams<{ fresh?: string }>();
  const rules = useGigsRules();
  const me = useMyFreelancer();
  const reloadMe = me.reload;
  useRefetchOnFocus(useCallback(() => reloadMe(), [reloadMe]));

  if (rules.data && me.data) return <Home me={me.data} rules={rules.data} fresh={fresh === '1'} />;
  if (rules.data && me.data === null) return <Intro rules={rules.data} />;
  return (
    <ScreenContainer title="Freelancing">
      <AsyncBoundary
        loading={rules.loading || me.loading}
        error={rules.error ?? me.error}
        hasData={false}
        onRetry={() => {
          rules.reload();
          me.reload();
        }}
        skeletonRows={4}
      >
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginTop: Spacing.two },
  flex: { flex: 1, gap: 2 },
  title: { ...Typography.heading, color: Brand.text },
  strong: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
  rows: { borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, paddingHorizontal: Spacing.three },
  gig: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  pressed: { opacity: 0.8 },
});
