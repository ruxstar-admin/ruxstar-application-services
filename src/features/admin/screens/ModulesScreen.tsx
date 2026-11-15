import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { Feedback } from '@/lib/haptics';
import { AdminService } from '@/services/admin-service';
import type { ModuleSettings } from '@/types/admin';
import { useCan } from '../access';
import { consoleStyles } from '../components/parts';
import { TINT } from '../components/tiles';
import { MODULE_LABEL } from '../labels';
import { MODULE_ICON, moduleSummary } from '../lib/modules';

function ModuleRow({ m, last, onPress }: { m: ModuleSettings; last: boolean; onPress: () => void }) {
  const tint = m.live ? TINT.purple : { bg: Brand.surfaceAlt, fg: Brand.textMuted };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${MODULE_LABEL[m.module]}, ${m.live ? 'live' : 'off'}. ${moduleSummary(m)}`}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.row, !last && styles.divider, pressed && styles.pressed]}
    >
      <View style={[styles.icon, { backgroundColor: tint.bg }]}>
        <Ionicons name={MODULE_ICON[m.module]} size={20} color={tint.fg} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.name} numberOfLines={1}>
          {MODULE_LABEL[m.module]}
        </Text>
        <Text style={consoleStyles.muted} numberOfLines={1}>
          {moduleSummary(m)}
        </Text>
      </View>
      <Badge label={m.live ? 'Live' : 'Off'} tone={m.live ? 'success' : 'neutral'} />
      <Ionicons name="chevron-forward" size={18} color={Brand.textFaint} />
    </Pressable>
  );
}

/** Every module on one short list; each opens its own screen with its settings, rules and GST. */
export function ModulesScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const canManage = useCan('modules.manage');
  const { data: modules, loading, error, reload } = useAsyncResource(() => AdminService.modules(token));
  useRefetchOnFocus(reload);

  return (
    <ScreenContainer title="Modules">
      <Text style={consoleStyles.muted}>
        {canManage ? 'Tap a module to change it. Changes apply at once and are written to the audit log.' : 'Tap a module to see its settings. Ask an admin to change them.'}
      </Text>
      <AsyncBoundary loading={loading} error={error} hasData={!!modules} onRetry={reload} skeletonRows={6}>
        {modules ? (
          <View style={styles.card}>
            {modules.map((m, i) => (
              <ModuleRow
                key={m.module}
                m={m}
                last={i === modules.length - 1}
                onPress={() => router.push({ pathname: '/(admin)/modules/[module]', params: { module: m.module } })}
              />
            ))}
          </View>
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, paddingHorizontal: Spacing.three, marginTop: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 68, paddingVertical: Spacing.two + 4 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Brand.border },
  pressed: { opacity: 0.6 },
  icon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
  name: { ...Typography.bodyStrong, color: Brand.text },
});
