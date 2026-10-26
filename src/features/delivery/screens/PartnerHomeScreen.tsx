import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { JobCard } from '@/features/delivery/components/JobCard';
import { usePartnerHome } from '@/features/delivery/hooks/use-partner-home';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { formatRupees } from '@/lib/money';
import { DeliveryService } from '@/services/delivery-service';
import type { PartnerHome } from '@/types/delivery';

const hoursAndMinutes = (minutes: number) => `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} m`;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Home({ home, onChanged }: { home: PartnerHome; onChanged: () => void }) {
  const router = useRouter();
  const token = useAuthToken();
  const [error, setError] = useState<string | null>(null);
  const { stats, active } = home;

  const toggle = async (online: boolean) => {
    setError(null);
    try {
      await DeliveryService.setOnline(token, online);
      Feedback.select();
      onChanged();
    } catch (err) {
      Feedback.error();
      setError(err instanceof ApiError && err.kind === 'conflict' ? 'Finish your current delivery before going offline.' : 'Could not change your status.');
    }
  };

  return (
    <>
      <View style={[styles.duty, stats.online && styles.dutyOn]}>
        <View style={styles.flex}>
          <Text style={styles.dutyLabel}>{stats.online ? 'On duty' : 'Offline'}</Text>
          <Text style={styles.dutyText}>{stats.online ? 'Taking jobs near you' : 'Go online to receive jobs'}</Text>
        </View>
        <Switch value={stats.online} onValueChange={toggle} trackColor={{ false: Brand.disabled, true: Brand.success }} thumbColor={Brand.text} accessibilityLabel="On duty" />
      </View>
      {error ? <ErrorBanner message={error} /> : null}

      <View style={styles.stats}>
        <Stat label="Earned today" value={formatRupees(stats.earnedToday)} />
        <Stat label="Drops done" value={String(stats.dropsToday)} />
        <Stat label="Online" value={hoursAndMinutes(stats.onlineMinutes)} />
      </View>

      {active ? (
        <>
          <Text style={styles.section}>In progress</Text>
          <JobCard job={active}>
            <PrimaryButton label="Continue delivery" onPress={() => router.push({ pathname: '/(partner)/job/[id]', params: { id: active.id } })} />
          </JobCard>
        </>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => router.push('/(partner)/jobs')} style={styles.waiting}>
          <Text style={styles.waitingText}>{home.waiting.length > 0 ? `${home.waiting.length} job${home.waiting.length > 1 ? 's' : ''} waiting` : 'No jobs right now'}</Text>
          <Text style={styles.statLabel}>Tap to see offers</Text>
        </Pressable>
      )}

      <Text style={styles.section}>Recent drops</Text>
      {home.recent.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </>
  );
}

export function PartnerHomeScreen() {
  const { data, loading, error, reload } = usePartnerHome();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.overline}>Ruxstar Partner</Text>
        <Text style={styles.sub}>Deliveries only</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={4}>
          {data ? <Home home={data} onChanged={reload} /> : null}
        </AsyncBoundary>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  container: { flex: 1, backgroundColor: Brand.bg },
  topBar: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, gap: 2 },
  overline: { ...Typography.overline, color: Brand.text },
  sub: { ...Typography.caption, color: Brand.textMuted },
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.two },
  duty: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.xl, backgroundColor: Brand.surface },
  dutyOn: { backgroundColor: 'rgba(52,199,89,0.14)' },
  dutyLabel: { ...Typography.title, color: Brand.text },
  dutyText: { ...Typography.caption, color: Brand.textMuted },
  stats: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.three },
  stat: { gap: 2 },
  statValue: { ...Typography.title, color: Brand.text },
  statLabel: { ...Typography.caption, color: Brand.textMuted },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.three },
  waiting: { gap: 2, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface },
  waitingText: { ...Typography.bodyStrong, color: Brand.text },
});
