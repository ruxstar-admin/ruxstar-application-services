import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { InputField } from '@/components/ui/InputField';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { ConsoleGigsService } from '@/services/gigs-service';
import type { ConsoleFreelancer } from '@/types/gigs';
import { Card, ListFooter, Row, consoleStyles, errorText } from '../components/parts';

const SEARCH_DELAY_MS = 350;

/** The badge for a freelancer: held by Ruxstar, not verified yet, live or still setting up. */
export const freelancerBadge = (f: Pick<ConsoleFreelancer, 'suspended' | 'verified' | 'status'>) =>
  f.suspended
    ? ({ label: 'On hold', tone: 'error' } as const)
    : !f.verified
      ? ({ label: 'Not verified', tone: 'warning' } as const)
      : f.status === 'live'
        ? ({ label: 'Live', tone: 'success' } as const)
        : ({ label: 'Setting up', tone: 'neutral' } as const);

const summary = (f: ConsoleFreelancer) =>
  [f.categoryLabel, f.city, `${f.gigs} gig${f.gigs === 1 ? '' : 's'}`, `${f.orders} order${f.orders === 1 ? '' : 's'}`].filter(Boolean).join(' · ');

function Results({ q }: { q: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => ConsoleGigsService.freelancers(token, q, cursor));

  if (list.loading) {
    return (
      <View style={consoleStyles.skeletons}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={68} radius={14} />
        ))}
      </View>
    );
  }
  if (list.error && list.items.length === 0) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load freelancers" message={errorText(list.error)} actionLabel="Try again" onAction={list.retry} />;
  }
  return (
    <FlatList
      data={list.items}
      keyExtractor={(f) => f.businessId}
      contentContainerStyle={consoleStyles.list}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={<EmptyState icon="color-palette-outline" title="No freelancers here" message={q ? 'Try another name.' : 'People who start freelancing show up here.'} />}
      ListFooterComponent={<ListFooter list={list} />}
      renderItem={({ item: f }) => (
        <Card>
          <Row
            name={f.name}
            avatarUrl={f.avatarUrl ?? undefined}
            title={f.name}
            subtitle={summary(f)}
            right={<Badge {...freelancerBadge(f)} />}
            onPress={() => router.push({ pathname: '/(admin)/freelancer/[id]', params: { id: f.businessId } })}
          />
        </Card>
      )}
    />
  );
}

/** Every freelancer, newest first, by name; each opens with their gigs and orders. */
export function GigFreelancersScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={consoleStyles.pad}>
        <ScreenHeader title="Freelancers" onBack={() => router.back()} />
      </View>
      <View style={styles.controls}>
        <InputField value={text} onChangeText={setText} placeholder="Freelancer name" autoCorrect={false} returnKeyType="search" maxLength={60} accessibilityLabel="Search freelancers" />
      </View>
      <Results key={q} q={q} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  controls: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
});
