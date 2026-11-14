import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { SupportService } from '@/services/support-service';
import { useSupportPassStore } from '@/stores/support-pass-store';
import { TicketRow } from '../components/parts';
import { useSupportSession } from '../hooks/use-support-session';
import { supportErrorText } from '../lib/support';

/** The account-on-hold banner: why they're here and what they can still do. */
function HoldNote({ message }: { message: string }) {
  return (
    <View style={styles.hold}>
      <Ionicons name="alert-circle-outline" size={20} color={Brand.warning} />
      <Text style={styles.holdText}>{message}</Text>
    </View>
  );
}

/**
 * Help & support: your tickets, latest activity first. Signed out with a support pass (an account on hold), it is
 * the only screen they reach, with a way back to log in.
 */
export function SupportListScreen() {
  const router = useRouter();
  const { hold, token, routes } = useSupportSession();
  const pass = useSupportPassStore((s) => s.pass);
  const clearPass = useSupportPassStore((s) => s.clearPass);
  const list = usePaginated((cursor) => SupportService.list(token, cursor));
  useRefetchOnFocus(list.refresh);

  const backToLogin = () => {
    clearPass();
    router.replace('/(auth)/login');
  };

  if (hold && !pass) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState icon="lock-closed-outline" title="Log in to message support" message="For your security, support access ends after a while." actionLabel="Go to log in" onAction={backToLogin} />
      </SafeAreaView>
    );
  }

  const header = (
    <View style={styles.headerBlock}>
      {hold && pass ? <HoldNote message={pass.message} /> : <Text style={styles.muted}>Questions about orders, payments, verification or your account. The Ruxstar team usually answers within a day.</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pad}>
        <ScreenHeader title={hold ? 'Account on hold' : 'Help & support'} onBack={hold ? backToLogin : () => router.back()} />
      </View>
      {list.loading ? (
        <View style={styles.skeletons}>
          {header}
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={56} radius={14} />
          ))}
        </View>
      ) : list.error && list.items.length === 0 ? (
        <View style={styles.pad}>
          {header}
          <EmptyState icon="cloud-offline-outline" title="Could not load your tickets" message={supportErrorText(list.error)} actionLabel="Try again" onAction={list.retry} />
        </View>
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={header}
          ListEmptyComponent={<EmptyState icon="help-buoy-outline" title="No tickets yet" message="When you message support, the conversation shows up here." />}
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footerSpin} /> : null}
          renderItem={({ item }) => <TicketRow ticket={item} onPress={() => router.push(routes.ticket(item.id))} />}
        />
      )}
      <View style={styles.footer}>
        <PrimaryButton label="Message support" onPress={() => router.push(routes.create(hold ? { category: 'account' } : {}))} />
        {hold ? (
          <View style={styles.center}>
            <TextLink label="Back to log in" onPress={backToLogin} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  pad: { paddingHorizontal: Spacing.three },
  headerBlock: { paddingBottom: Spacing.two },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.four },
  skeletons: { gap: Spacing.three, paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  footerSpin: { paddingVertical: Spacing.three },
  footer: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, paddingTop: Spacing.two, gap: Spacing.three, alignItems: 'stretch' },
  center: { alignItems: 'center' },
  muted: { ...Typography.caption, color: Brand.textMuted },
  hold: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: 'rgba(255,176,32,0.12)' },
  holdText: { ...Typography.body, flex: 1, color: Brand.text },
});
