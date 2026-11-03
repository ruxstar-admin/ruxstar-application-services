import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';
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
}

const BADGE_LABELS: Record<ProfileBadge, string> = {
  user: 'Normal user',
  vendor: 'Vendor',
  trainer: 'Trainer',
  delivery: 'Delivery partner',
};

/** Each block rises 70ms after the one before it; Reanimated skips layout animations under Reduce Motion. */
const rise = (step: number) => FadeInDown.duration(360).delay(70 * step).springify().damping(18);

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
export function ProfileHeader({ profile, name, onPressAvatar, editable }: ProfileHeaderProps) {
  return (
    <View style={styles.container}>
      <Animated.View entering={rise(0)} style={styles.topRow}>
        <ProfileAvatar name={name} uri={profile.avatarUrl} onPress={onPressAvatar} editable={editable} />
        <View style={styles.stats}>
          <Stat value={String(profile.posts)} label="Posts" />
          <Stat value={String(profile.engagements)} label="Engagements" />
          <Stat value={profile.rating === null ? '–' : profile.rating.toFixed(1)} label="Rating" />
        </View>
      </Animated.View>

      <Animated.View entering={rise(1)} style={styles.identity}>
        <Text style={styles.name}>{name}</Text>
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

      <Animated.View entering={rise(2)} style={styles.badges}>
        {profile.badges.map((badge) => (
          <Badge key={badge} label={BADGE_LABELS[badge]} tone={badge === 'user' ? 'neutral' : 'accent'} />
        ))}
      </Animated.View>
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
  name: { ...Typography.heading, color: Brand.text },
  username: { ...Typography.caption, color: Brand.primarySoft },
  bio: { ...Typography.body, color: Brand.textMuted, marginTop: Spacing.one },
  fact: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginTop: Spacing.one },
  factText: { ...Typography.caption, color: Brand.textMuted },
  member: { ...Typography.caption, color: Brand.textFaint, marginTop: Spacing.one },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
