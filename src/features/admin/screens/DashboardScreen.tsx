import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { AdminService } from '@/services/admin-service';
import { useAuthStore } from '@/stores/auth-store';
import { useAccess } from '../access';
import { Card, ConsoleScreen, Section, consoleStyles } from '../components/parts';
import { MODULE_LABEL } from '../labels';

/** "2 people and 1 review", or empty when only posts are reported. */
const alsoReported = ({ people, reviews }: { people: number; reviews: number }) =>
  [people > 0 ? (people === 1 ? '1 person' : `${people} people`) : null, reviews > 0 ? (reviews === 1 ? '1 review' : `${reviews} reviews`) : null]
    .filter(Boolean)
    .join(' and ');

function Tile({ icon, label, value, caption, href }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number; caption: string; href: Href }) {
  const router = useRouter();
  return (
    <Card onPress={() => router.push(href)}>
      <View style={styles.tileHead}>
        <Ionicons name={icon} size={18} color={Brand.textMuted} />
        <Text style={styles.tileLabel}>{label}</Text>
        <Ionicons name="chevron-forward" size={16} color={Brand.textMuted} />
      </View>
      <Text style={styles.number}>{value.toLocaleString('en-IN')}</Text>
      <Text style={consoleStyles.muted}>{caption}</Text>
    </Card>
  );
}

export function DashboardScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const access = useAccess();
  const name = useAuthStore((s) => s.name);
  const { data, loading, error, reload } = useAsyncResource(() => AdminService.getOverview(token));
  const first = name?.split(' ')[0];

  return (
    <ConsoleScreen
      title={first ? `Hi ${first}` : 'Dashboard'}
      subtitle={access.admin ? 'You are an admin, so every section is open to you.' : `Signed in as ${access.title ?? 'Ruxstar staff'}.`}
    >
      <ScrollView
        contentContainerStyle={consoleStyles.list}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} tintColor={Brand.primarySoft} />}
        showsVerticalScrollIndicator={false}
      >
        <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={4}>
          {data ? (
            <>
              {data.kyc ? (
                <Tile
                  icon="shield-checkmark-outline"
                  label="Verification to review"
                  value={data.kyc.waiting}
                  caption={data.kyc.waiting === 0 ? 'Nothing waiting.' : 'Identity checks waiting for a decision'}
                  href="/(admin)/(tabs)/kyc"
                />
              ) : null}
              {data.businesses ? (
                <Tile
                  icon="storefront-outline"
                  label="Businesses"
                  value={data.businesses.total}
                  caption={`${data.businesses.live} live${data.businesses.suspended > 0 ? `, ${data.businesses.suspended} on hold` : ''}`}
                  href="/(admin)/businesses"
                />
              ) : null}
              {data.reports ? (
                <Tile
                  icon="flag-outline"
                  label="Reported posts"
                  value={data.reports.posts}
                  caption={
                    alsoReported(data.reports)
                      ? `${alsoReported(data.reports)} reported too`
                      : data.reports.posts === 0
                        ? 'No open reports.'
                        : `${data.reports.reports} reports in all`
                  }
                  href="/(admin)/(tabs)/reports"
                />
              ) : null}
              {data.orders ? (
                <Tile
                  icon="receipt-outline"
                  label="Print order problems"
                  value={data.orders.problems}
                  caption={data.orders.problems === 0 ? 'Nothing waiting.' : "Shop payouts held until you settle them"}
                  href="/(admin)/(tabs)/reports"
                />
              ) : null}
              {data.users ? (
                <Tile
                  icon="people-outline"
                  label="People"
                  value={data.users.total}
                  caption={`${data.users.newThisWeek} joined this week${data.users.suspended > 0 ? `, ${data.users.suspended} on hold` : ''}`}
                  href="/(admin)/(tabs)/people"
                />
              ) : null}
              {data.staff ? (
                <Tile icon="shield-outline" label="Ruxstar staff" value={data.staff.active} caption="Active team members, not counting admins" href="/(admin)/staff" />
              ) : null}
              {data.modules ? (
                <>
                  <Section>Modules</Section>
                  <Card onPress={() => router.push('/(admin)/modules')}>
                    <View style={styles.badges}>
                      {data.modules.map((m) => (
                        <Badge key={m.module} label={`${MODULE_LABEL[m.module]} · ${m.live ? 'Live' : 'Off'}`} tone={m.live ? 'success' : 'neutral'} />
                      ))}
                    </View>
                  </Card>
                </>
              ) : null}
            </>
          ) : null}
        </AsyncBoundary>
      </ScrollView>
    </ConsoleScreen>
  );
}

const styles = StyleSheet.create({
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  tileLabel: { ...Typography.caption, flex: 1, color: Brand.textMuted },
  number: { ...Typography.display, color: Brand.text },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
