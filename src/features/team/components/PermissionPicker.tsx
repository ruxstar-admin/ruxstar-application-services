import { StyleSheet, Text, View } from 'react-native';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import type { PermissionInfo, TeamPermission } from '@/types/team';
import { togglePermission } from '../lib/team';

const OWNER_ONLY = 'Always yours: withdrawals, payment details, publishing, deleting the business and the team itself.';

/** The owner picks what one person may do. Turning on something that needs "See orders" turns that on too. */
export function PermissionPicker({
  catalog,
  value,
  onChange,
}: {
  catalog: PermissionInfo[];
  value: TeamPermission[];
  onChange: (next: TeamPermission[]) => void;
}) {
  const label = (key: TeamPermission) => catalog.find((p) => p.key === key)?.label ?? key;
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        {catalog.map((p) => (
          <ToggleRow
            key={p.key}
            title={p.label}
            subtitle={[p.hint, p.needs ? `Comes with "${label(p.needs)}"` : null].filter(Boolean).join('. ') || undefined}
            value={value.includes(p.key)}
            onValueChange={(on) => onChange(togglePermission(catalog, value, p.key, on))}
          />
        ))}
      </View>
      <Text style={styles.muted}>{OWNER_ONLY}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  card: { borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border, backgroundColor: Brand.surface, paddingHorizontal: Spacing.three },
  muted: { ...Typography.caption, color: Brand.textMuted },
});
