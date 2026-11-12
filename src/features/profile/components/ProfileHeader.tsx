import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { VerifiedTick } from '@/features/kyc/components/VerifiedTick';
import { Feedback } from '@/lib/haptics';
import { compactCount } from '@/lib/time';
import type { Profile, ProfileBadge } from '@/types/profile';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING = { damping: 16, stiffness: 260 } as const;
const AVATAR = 80;

interface ProfileHeaderProps {
  profile: Profile;
  /** Display name; the signed-in user's name lives in the auth store, not the profile payload. */
  name: string;
  /** Makes the photo a button, with a camera mark when `editable`. */
  onPressAvatar?: () => void;
  editable?: boolean;
  /** Opens the followers or following list. */
  onOpenPeople?: (side: 'followers' | 'following') => void;
}

const BADGE_LABELS: Record<Exclude<ProfileBadge, 'user'>, string> = {
  vendor: 'Vendor',
  trainer: 'Trainer',
  delivery: 'Delivery partner',
};

/** Each block rises 60ms after the one before it; Reanimated skips layout animations under Reduce Motion. */
const rise = (step: number) => FadeInDown.duration(280).delay(60 * step);

function Stat({ value, label, onPress }: { value: string; label: string; onPress?: () => void }) {
  const body = (
    <>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );
  if (!onPress) {
    return (
      <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      style={styles.stat}
      accessibilityRole="button"
      accessibilityLabel={`${value} ${label}`}
      hitSlop={8}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
    >
      {body}
    </Pressable>
  );
}

function ProfileAvatar({ name, uri, onPress, editable }: { name: string; uri?: string; onPress?: () => void; editable?: boolean }) {
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!onPress) return <Avatar name={name} uri={uri} size={AVATAR} />;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={uri ? 'View profile photo' : editable ? 'Add a profile photo' : name}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.94, SPRING);
        Feedback.tap();
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING);
      }}
      style={pressStyle}
    >
      <Avatar name={name} uri={uri} size={AVATAR} />
      {editable ? (
        <View style={styles.cameraMark}>
          <Ionicons name={uri ? 'camera' : 'add'} size={14} color={Brand.onAction} />
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

/** Identity block shared by your profile and other people's: avatar, counts, handle, bio, city, role badges. */
export function ProfileHeader({ profile, name, onPressAvatar, editable, onOpenPeople }: ProfileHeaderProps) {
  const roleBadges = profile.badges.filter((b): b is Exclude<ProfileBadge, 'user'> => b !== 'user');
  return (
    <View style={styles.container}>
      <Animated.View entering={rise(0)} style={styles.topRow}>
        <ProfileAvatar name={name} uri={profile.avatarUrl} onPress={onPressAvatar} editable={editable} />
        <View style={styles.stats}>
          <Stat value={compactCount(profile.posts)} label="Posts" />
          <Stat value={compactCount(profile.followers)} label="Followers" onPress={onOpenPeople && (() => onOpenPeople('followers'))} />
          <Stat value={compactCount(profile.following)} label="Following" onPress={onOpenPeople && (() => onOpenPeople('following'))} />
        </View>
      </Animated.View>

      <Animated.View entering={rise(1)} style={styles.identity}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{name}</Text>
          {profile.verified ? <VerifiedTick size={20} /> : null}
        </View>
        <Text style={styles.username}>@{profile.username}</Text>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        {profile.city ? (
          <View style={styles.fact}>
            <Ionicons name="location-outline" size={14} color={Brand.textMuted} />
            <Text style={styles.factText}>{profile.city}</Text>
          </View>
        ) : null}
        <Text style={styles.member}>Member since {profile.memberSince}</Text>
      </Animated.View>

      {roleBadges.length > 0 ? (
        <Animated.View entering={rise(2)} style={styles.badges}>
          {roleBadges.map((badge) => (
            <Badge key={badge} label={BADGE_LABELS[badge]} tone="accent" />
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  cameraMark: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.action,
    borderWidth: 2,
    borderColor: Brand.bg,
  },
  stats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { ...Typography.title, color: Brand.text },
  statLabel: { ...Typography.caption, color: Brand.textMuted },
  identity: { gap: Spacing.one },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  name: { ...Typography.heading, color: Brand.text },
  username: { ...Typography.caption, color: Brand.primarySoft },
  bio: { ...Typography.body, color: Brand.textMuted, marginTop: Spacing.one },
  fact: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginTop: Spacing.one },
  factText: { ...Typography.caption, color: Brand.textMuted },
  member: { ...Typography.caption, color: Brand.textFaint, marginTop: Spacing.one },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
