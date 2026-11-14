import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '@/components/ui/Badge';
import { Brand, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { canOpen } from '@/features/vendor/hooks/use-vendor-businesses';
import { BUSINESS_MODULES, statusOf } from '@/features/vendor/lib/business-modules';
import { Feedback } from '@/lib/haptics';
import type { Business } from '@/types/business';

interface BusinessCardProps {
  business: Business;
  busy: boolean;
  onPress: () => void;
  onToggle: (open: boolean) => void;
}

/** A business in the portal's grid: cover, status, name, and an Open switch when it can open. */
export function BusinessCard({ business, busy, onPress, onToggle }: BusinessCardProps) {
  const info = BUSINESS_MODULES[business.module];
  const status = statusOf(business);
  const cover = business.photos[0];
  const switchable = canOpen(business);
  const place = business.location?.city;
  const subtitle = business.status === 'draft' ? 'Finish setup' : [info.label, place].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${business.name}, ${status.label}`}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.coverWrap}>
        {cover ? (
          <Image source={{ uri: cover.url }} style={styles.cover} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.cover, styles.coverEmpty]}>
            <Ionicons name={info.icon} size={32} color={Brand.textMuted} />
          </View>
        )}
        <View style={styles.badge}>
          <Badge label={status.label} tone={status.tone} />
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {business.name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {switchable ? (
        <View style={styles.toggle}>
          <Text style={[styles.toggleText, business.open && styles.openText]}>{business.open ? 'Open' : 'Closed'}</Text>
          {busy ? <ActivityIndicator size="small" color={Brand.textMuted} /> : null}
          <Switch
            value={business.open}
            onValueChange={onToggle}
            disabled={busy}
            trackColor={{ false: Brand.disabled, true: Brand.success }}
            thumbColor={Brand.text}
            accessibilityLabel={`${business.name} ${business.open ? 'open' : 'closed'}`}
          />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    borderRadius: Radius.lg,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.7 },
  coverWrap: { position: 'relative' },
  cover: { width: '100%', aspectRatio: 4 / 3, backgroundColor: Brand.surfaceAlt },
  coverEmpty: { alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: Spacing.two, left: Spacing.two },
  body: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.three, gap: 2, flexGrow: 1 },
  name: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  subtitle: { ...Typography.caption, fontSize: 12, color: Brand.textMuted },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: Brand.border,
  },
  toggleText: { flex: 1, ...Typography.caption, fontFamily: Fonts.semibold, color: Brand.textMuted },
  openText: { color: Brand.success },
});
