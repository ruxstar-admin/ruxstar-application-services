import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '@/components/ui/Badge';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { canOpen } from '@/features/vendor/hooks/use-vendor-businesses';
import { BUSINESS_MODULES, statusOf } from '@/features/vendor/lib/business-modules';
import { Feedback } from '@/lib/haptics';
import type { Business } from '@/types/business';

interface BusinessRowProps {
  business: Business;
  busy: boolean;
  onPress: () => void;
  onToggle: (open: boolean) => void;
}

/** A business in the portal: cover, name, and an Open switch when it can open; otherwise its status badge. */
export function BusinessRow({ business, busy, onPress, onToggle }: BusinessRowProps) {
  const info = BUSINESS_MODULES[business.module];
  const status = statusOf(business);
  const cover = business.photos[0];
  const switchable = canOpen(business);
  const subtitle =
    business.status === 'draft' ? 'Draft · Finish setup' : switchable ? (business.open ? 'Open · Taking orders' : 'Closed') : `${info.label} · ${status.label}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${business.name}, ${subtitle}`}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {cover ? (
        <Image source={{ uri: cover.url }} style={styles.cover} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.cover, styles.coverEmpty]}>
          <Ionicons name={info.icon} size={24} color={Brand.textMuted} />
        </View>
      )}
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {business.name}
        </Text>
        <Text style={[styles.subtitle, switchable && business.open && styles.openText]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {switchable ? (
        <View style={styles.toggle}>
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
      ) : (
        <Badge label={status.label} tone={status.tone} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    paddingRight: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  pressed: { opacity: 0.7 },
  cover: { width: 56, height: 56, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  coverEmpty: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  name: { ...Typography.bodyStrong, color: Brand.text },
  subtitle: { ...Typography.caption, color: Brand.textMuted },
  openText: { color: Brand.success },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
