import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import { AdminService } from '@/services/admin-service';
import type { ModulePatch, ModuleSettings } from '@/types/admin';
import { useCan } from '../access';
import { Card, Fact, Facts, consoleStyles, errorText } from '../components/parts';
import { MODULE_LABEL } from '../labels';

const percentOf = (bps: number) => String(bps / 100);

function Module({ m, onSaved }: { m: ModuleSettings; onSaved: (m: ModuleSettings) => void }) {
  const token = useAuthToken();
  const canManage = useCan('modules.manage');
  const [busy, setBusy] = useState<keyof ModulePatch | null>(null);
  const [commission, setCommission] = useState(percentOf(m.commissionBps));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const key = useRef(newIdempotencyKey());

  const bps = Math.round(Number(commission) * 100);
  const commissionValid = commission.trim() !== '' && Number.isFinite(bps) && bps >= 0 && bps <= 10000;

  const save = async (patch: ModulePatch) => {
    if (busy) return;
    setBusy(Object.keys(patch)[0] as keyof ModulePatch);
    setError(null);
    setSaved(false);
    try {
      const done = await AdminService.updateModule(token, m.module, patch, key.current);
      key.current = newIdempotencyKey();
      Feedback.success();
      onSaved(done);
      setCommission(percentOf(done.commissionBps));
      setSaved(true);
    } catch (err) {
      Feedback.error();
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text style={styles.name}>{MODULE_LABEL[m.module]}</Text>
          <Text style={consoleStyles.muted}>{saved ? 'Saved just now' : `Changed ${timeAgo(m.updatedAt)}`}</Text>
        </View>
        <Badge label={m.live ? 'Live' : 'Off'} tone={m.live ? 'success' : 'neutral'} />
      </View>

      {canManage ? (
        <>
          <ToggleRow title="Live" subtitle="Off hides it everywhere, for everyone." value={m.live} onValueChange={(live) => save({ live })} />
          <ToggleRow title="New vendors can join" subtitle="Off keeps current vendors working but stops new ones joining." value={m.signupsOpen} onValueChange={(signupsOpen) => save({ signupsOpen })} />
          <ToggleRow title="Delivery" subtitle="Orders can be sent with a Ruxstar delivery partner." value={m.deliveryEnabled} onValueChange={(deliveryEnabled) => save({ deliveryEnabled })} />
          <InputField
            label="Commission on each order (%)"
            keyboardType="decimal-pad"
            value={commission}
            onChangeText={(value) => setCommission(value.replace(/[^\d.]/g, ''))}
            error={commissionValid ? undefined : 'Enter a number from 0 to 100'}
          />
          <PrimaryButton
            label="Save commission"
            variant="outline"
            onPress={() => save({ commissionBps: bps })}
            loading={busy === 'commissionBps'}
            disabled={!commissionValid || bps === m.commissionBps || (busy !== null && busy !== 'commissionBps')}
          />
        </>
      ) : (
        <Facts>
          <Fact label="New vendors can join" value={m.signupsOpen ? 'Yes' : 'No'} />
          <Fact label="Delivery" value={m.deliveryEnabled ? 'On' : 'Off'} />
          <Fact label="Commission" value={`${percentOf(m.commissionBps)}%`} />
        </Facts>
      )}
      {error ? <ErrorBanner message={error} /> : null}
    </Card>
  );
}

export function ModulesScreen() {
  const token = useAuthToken();
  const canManage = useCan('modules.manage');
  const { data: modules, loading, error, reload, setData } = useAsyncResource(() => AdminService.modules(token));

  return (
    <ScreenContainer title="Modules">
      <Text style={consoleStyles.muted}>
        {canManage ? 'Changes apply at once and are written to the audit log.' : 'You can see these settings. Ask an admin to change them.'}
      </Text>
      <AsyncBoundary loading={loading} error={error} hasData={!!modules} onRetry={reload}>
        {modules?.map((m) => (
          <Module key={m.module} m={m} onSaved={(done) => setData(modules.map((x) => (x.module === done.module ? done : x)))} />
        ))}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  name: { ...Typography.bodyStrong, color: Brand.text },
});
