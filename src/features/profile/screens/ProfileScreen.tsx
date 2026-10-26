import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { ProfileHeader } from '@/features/profile/components/ProfileHeader';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { ProfileService } from '@/services/profile-service';
import { ROLES } from '@/constants/roles';
import { useAuthStore } from '@/stores/auth-store';

const TABS = [
  { key: 'personal', label: 'Personal' },
  { key: 'business', label: 'Business' },
] as const;

export function ProfileScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const name = useAuthStore((s) => s.name) ?? '';
  const isVendor = useAuthStore((s) => s.roles.includes(ROLES.VENDOR));
  const isPartner = useAuthStore((s) => s.roles.includes(ROLES.DELIVERY));
  const { data, loading, error, reload } = useAsyncResource(() => ProfileService.getMe(token));
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('personal');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Profile</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          hitSlop={12}
          onPress={() => {
            Feedback.tap();
            router.push('/(customer)/settings');
          }}
        >
          <Ionicons name="settings-outline" size={24} color={Brand.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={3}>
          {data ? (
            <>
              <ProfileHeader profile={data} name={name} />
              <PrimaryButton label="Edit profile" variant="outline" onPress={() => router.push('/(customer)/edit-profile')} />
              {isVendor ? <PrimaryButton label="Open vendor portal" onPress={() => router.push('/(vendor)/dashboard')} /> : null}
              {isPartner ? <PrimaryButton label="Open Ruxstar Partner app" onPress={() => router.push('/(partner)')} /> : null}
              <SegmentedTabs options={TABS} value={tab} onChange={setTab} />
              {tab === 'personal' ? (
                <EmptyState icon="images-outline" title="No posts yet" message="Photos and posts you share will appear here." />
              ) : (
                <EmptyState
                  icon="storefront-outline"
                  title="No business yet"
                  message="Businesses you run on Ruxstar will appear here."
                  actionLabel={isVendor ? 'Open vendor portal' : 'Become a vendor'}
                  onAction={() => router.push(isVendor ? '/(vendor)/dashboard' : '/(customer)/settings/verification')}
                />
              )}
            </>
          ) : null}
        </AsyncBoundary>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  title: { ...Typography.title, color: Brand.text },
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three },
});
