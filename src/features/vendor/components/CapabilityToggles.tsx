import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { MODULES, OWNER_ONLY_ACTIONS } from '@/features/vendor/lib/capabilities';
import type { ModuleKey } from '@/types/vendor';

interface CapabilityTogglesProps {
  module: ModuleKey;
  granted: readonly string[];
  onChange: (capabilities: string[]) => void;
}

/** The module's delegable switches, then the owner-only actions shown as locked so they are never a surprise. */
export function CapabilityToggles({ module, granted, onChange }: CapabilityTogglesProps) {
  const toggle = (key: string, on: boolean) => onChange(on ? [...granted, key] : granted.filter((k) => k !== key));

  return (
    <View>
      <Text style={styles.section}>{`${MODULES[module].label} permissions`}</Text>
      {MODULES[module].capabilities.map((capability) => (
        <ToggleRow key={capability.key} title={capability.label} value={granted.includes(capability.key)} onValueChange={(on) => toggle(capability.key, on)} />
      ))}

      <Text style={styles.section}>Owner only</Text>
      {OWNER_ONLY_ACTIONS.map((action) => (
        <View key={action} style={styles.locked}>
          <Ionicons name="lock-closed-outline" size={18} color={Brand.textFaint} />
          <Text style={styles.lockedText}>{action}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.three, marginBottom: Spacing.one },
  locked: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 44 },
  lockedText: { ...Typography.body, color: Brand.textFaint },
});
