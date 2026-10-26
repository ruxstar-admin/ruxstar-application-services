import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Brand, Spacing, Typography } from '@/constants/theme';
import type { Profile, ProfileBadge } from '@/types/profile';

interface ProfileHeaderProps {
  profile: Profile;
  /** Display name; the signed-in user's name lives in the auth store, not the profile payload. */
  name: string;
}

const BADGE_LABELS: Record<ProfileBadge, string> = {
  user: 'Normal user',
  vendor: 'Vendor',
  trainer: 'Trainer',
  delivery: 'Delivery partner',
};

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** Identity block shared by your profile and other people's: avatar, counts, handle, bio, role badges. */
export function ProfileHeader({ profile, name }: ProfileHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Avatar name={name} uri={profile.avatarUrl} size={80} />
        <View style={styles.stats}>
          <Stat value={String(profile.posts)} label="Posts" />
          <Stat value={String(profile.engagements)} label="Engagements" />
          <Stat value={profile.rating === null ? '–' : profile.rating.toFixed(1)} label="Rating" />
        </View>
      </View>

      <View style={styles.identity}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        <Text style={styles.member}>Member since {profile.memberSince}</Text>
      </View>

      <View style={styles.badges}>
        {profile.badges.map((badge) => (
          <Badge key={badge} label={BADGE_LABELS[badge]} tone={badge === 'user' ? 'neutral' : 'accent'} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  stats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { ...Typography.title, color: Brand.text },
  statLabel: { ...Typography.caption, color: Brand.textMuted },
  identity: { gap: Spacing.one },
  name: { ...Typography.heading, color: Brand.text },
  username: { ...Typography.caption, color: Brand.primarySoft },
  bio: { ...Typography.body, color: Brand.textMuted, marginTop: Spacing.one },
  member: { ...Typography.caption, color: Brand.textFaint, marginTop: Spacing.one },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
