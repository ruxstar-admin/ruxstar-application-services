import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { WEBSITE_URL } from '@/constants/config';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { ProfileChecklist, type ProfileStep } from '@/features/profile/components/ProfileChecklist';
import { ProfileHeader } from '@/features/profile/components/ProfileHeader';
import { ProfilePhotoSheet } from '@/features/profile/components/ProfilePhotoSheet';
import { ProfilePosts } from '@/features/social/components/ProfilePosts';
import { useFeedStore } from '@/features/social/stores/feed-store';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { Feedback } from '@/lib/haptics';
import { ProfileService } from '@/services/profile-service';
import { ROLES } from '@/constants/roles';
import { useAuthStore } from '@/stores/auth-store';

const TABS = [
  { key: 'personal', label: 'Personal' },
  { key: 'business', label: 'Business' },
] as const;

const rise = (step: number) => FadeInDown.duration(280).delay(60 * step);

export function ProfileScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const name = useAuthStore((s) => s.name) ?? '';
  const isVendor = useAuthStore((s) => s.roles.includes(ROLES.VENDOR));
  const isPartner = useAuthStore((s) => s.roles.includes(ROLES.DELIVERY));
  const addRole = useAuthStore((s) => s.addRole);
  const { data, loading, error, reload } = useAsyncResource(() => ProfileService.getMe(token));
  useRefetchOnFocus(reload);
  // Approval happens on the server, so the stored roles catch up from the profile without a fresh sign-in.
  const verifiedVendor = !!data?.badges.includes('vendor');
  useEffect(() => {
    if (verifiedVendor) addRole(ROLES.VENDOR);
  }, [verifiedVendor, addRole]);
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('personal');
  const [viewingPhoto, setViewingPhoto] = useState(false);
  // Only a pull shows the spinner; focus refetches stay silent.
  const [pulled, setPulled] = useState(false);
  if (pulled && !loading) setPulled(false);
  const [refreshes, setRefreshes] = useState(0);
  const postsVersion = useFeedStore((s) => s.version);

  const refresh = () => {
    Feedback.tap();
    setPulled(true);
    setRefreshes((n) => n + 1);
    reload();
  };

  const share = async () => {
    if (!data) return;
    Feedback.tap();
    const url = `${WEBSITE_URL}/u/${data.username}`;
    await Share.share({ message: `${name} on Ruxstar: ${url}`, title: name }).catch(() => undefined);
  };

  const openStep = (step: ProfileStep) => {
    if (step === 'photo') setViewingPhoto(true);
    else router.push({ pathname: '/(customer)/edit-profile', params: { focus: step } });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.topActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Saved posts"
            hitSlop={12}
            onPress={() => {
              Feedback.tap();
              router.push('/(customer)/saved');
            }}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Ionicons name="bookmark-outline" size={23} color={Brand.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            hitSlop={12}
            onPress={() => {
              Feedback.tap();
              router.push('/(customer)/settings');
            }}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Ionicons name="settings-outline" size={24} color={Brand.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={pulled && loading}
            onRefresh={refresh}
            tintColor={Brand.primarySoft}
            colors={[Brand.primary]}
            progressBackgroundColor={Brand.surface}
          />
        }
      >
        <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={3}>
          {data ? (
            <>
              <ProfileHeader profile={data} name={name} editable onPressAvatar={() => setViewingPhoto(true)} />

              <Animated.View entering={rise(3)} style={styles.actions}>
                <View style={styles.grow}>
                  <PrimaryButton label="Edit profile" variant="outline" onPress={() => router.push('/(customer)/edit-profile')} />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isVendor ? 'Open vendor portal' : 'Get verified to open the vendor portal'}
                  onPress={() => {
                    Feedback.tap();
                    router.push(isVendor ? '/(vendor)/dashboard' : '/(customer)/settings/verification');
                  }}
                  style={({ pressed }) => [styles.iconButton, isVendor && styles.vendorButton, pressed && styles.iconButtonPressed]}
                >
                  <Ionicons name={isVendor ? 'storefront' : 'storefront-outline'} size={22} color={isVendor ? Brand.onAction : Brand.textFaint} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Share profile"
                  onPress={share}
                  style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
                >
                  <Ionicons name="share-social-outline" size={22} color={Brand.text} />
                </Pressable>
              </Animated.View>

              <Animated.View entering={rise(4)}>
                <ProfileChecklist profile={data} onStep={openStep} />
              </Animated.View>

              {isPartner ? <PrimaryButton label="Open Ruxstar Partner app" onPress={() => router.push('/(partner)')} /> : null}

              <Animated.View entering={rise(5)} style={styles.tabs}>
                {isVendor ? <SegmentedTabs options={TABS} value={tab} onChange={setTab} /> : null}
                {!isVendor || tab === 'personal' ? (
                  <ProfilePosts
                    key={`personal-${postsVersion}-${refreshes}`}
                    owner={data.id}
                    kind="personal"
                    empty={{
                      icon: 'images-outline',
                      title: 'No posts yet',
                      message: 'Photos and posts you share will appear here.',
                      actionLabel: 'Create a post',
                      onAction: () => router.push('/(customer)/create-post'),
                    }}
                  />
                ) : (
                  <ProfilePosts
                    key={`business-${postsVersion}-${refreshes}`}
                    owner={data.id}
                    kind="business"
                    empty={{
                      icon: 'storefront-outline',
                      title: 'No business posts yet',
                      message: 'Post offers and updates from the vendor portal.',
                      actionLabel: 'Open vendor portal',
                      onAction: () => router.push('/(vendor)/dashboard'),
                    }}
                  />
                )}
              </Animated.View>

              <ProfilePhotoSheet
                visible={viewingPhoto}
                onClose={() => setViewingPhoto(false)}
                name={name}
                avatarUrl={data.avatarUrl}
                onChanged={reload}
              />
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
  topActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  pressed: { opacity: 0.6 },
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three },
  actions: { flexDirection: 'row', gap: Spacing.two },
  grow: { flex: 1 },
  iconButton: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: Brand.border, alignItems: 'center', justifyContent: 'center' },
  vendorButton: { borderColor: Brand.action, backgroundColor: Brand.action },
  iconButtonPressed: { backgroundColor: Brand.surfaceAlt, transform: [{ scale: 0.94 }] },
  tabs: { gap: Spacing.three },
});
