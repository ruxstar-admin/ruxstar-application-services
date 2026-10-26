import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { Brand, Spacing, Typography } from '@/constants/theme';

const LOGIN_TABS = [
  { key: 'password', label: 'Password' },
  { key: 'otp', label: 'One-time code' },
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

/** Dev-only: every shared component in one place, so theme and motion can be reviewed at a glance. */
export function GalleryScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof LOGIN_TABS)[number]['key']>('password');
  const [orders, setOrders] = useState(true);
  const [digest, setDigest] = useState(false);
  const [sheet, setSheet] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Component gallery" onBack={() => router.back()} />

        <Section title="Buttons">
          <PrimaryButton label="Continue" onPress={() => setSheet(true)} />
          <PrimaryButton label="Disabled" onPress={() => undefined} disabled />
          <PrimaryButton label="Loading" onPress={() => undefined} loading />
          <PrimaryButton label="Create an account" variant="outline" onPress={() => undefined} />
          <Chip label="SMS" onPress={() => undefined} />
        </Section>

        <Section title="Tabs">
          <SegmentedTabs options={LOGIN_TABS} value={tab} onChange={setTab} />
        </Section>

        <Section title="Identity">
          <View style={styles.row}>
            <Avatar name="Priya Nair" />
            <Avatar name="Easwanth Konduru" size={64} />
            <Badge label="Vendor" tone="accent" />
            <Badge label="Verified" tone="success" />
            <Badge label="Pending" tone="warning" />
          </View>
        </Section>

        <Section title="Rows">
          <ListRow icon="phone-portrait-outline" title="Sessions & devices" subtitle="3 active" onPress={() => undefined} />
          <ToggleRow title="Orders & deliveries" subtitle="Status changes on what you buy or sell" value={orders} onValueChange={setOrders} />
          <ToggleRow title="Weekly digest" value={digest} onValueChange={setDigest} />
          <ListRow icon="log-out-outline" title="Log out" destructive onPress={() => undefined} />
          <ListRow icon="person-circle-outline" title="Open sample profile (needs login)" onPress={() => router.push('/(customer)/user/priya-nair')} />
        </Section>

        <Section title="Loading & empty">
          <Skeleton height={20} width="60%" />
          <Skeleton height={14} />
          <Skeleton height={120} radius={16} />
          <EmptyState
            icon="notifications-off-outline"
            title="Nothing here yet"
            message="When something happens, it shows up here."
            actionLabel="Refresh"
            onAction={() => undefined}
          />
        </Section>
      </ScrollView>

      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title="Report Priya Nair">
        <Text style={styles.sheetText}>Reports are private. They never see who reported them.</Text>
        <ListRow title="Spam or scam" onPress={() => setSheet(false)} />
        <ListRow title="Fake store or listing" onPress={() => setSheet(false)} />
        <PrimaryButton label="Cancel" variant="outline" onPress={() => setSheet(false)} />
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.six },
  section: { gap: Spacing.two, marginTop: Spacing.four },
  sectionTitle: { ...Typography.overline, color: Brand.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.three },
  sheetText: { ...Typography.body, color: Brand.textMuted },
});
