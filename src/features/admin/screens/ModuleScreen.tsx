import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { AdminService } from '@/services/admin-service';
import type { ModuleName } from '@/types/admin';
import { useCan } from '../access';
import { DeliveryRates, ModuleCore, Withdrawals } from '../components/ModuleForms';
import { Card, Section, consoleStyles } from '../components/parts';
import { RulesForm } from '../components/RulesForm';
import { MODULE_LABEL } from '../labels';
import { isGstModule, isModuleName } from '../lib/modules';

function Settings({ module }: { module: ModuleName }) {
  const router = useRouter();
  const token = useAuthToken();
  const canManage = useCan('modules.manage');
  // There is no single-module read, so the list is loaded and this one picked out.
  const { data: m, loading, error, reload, setData } = useAsyncResource(() => AdminService.modules(token).then((all) => all.find((x) => x.module === module) ?? null), module);

  return (
    <ScreenContainer title={MODULE_LABEL[module]}>
      <Text style={consoleStyles.muted}>
        {canManage ? 'Changes apply at once and are written to the audit log.' : 'You can see these settings. Ask an admin to change them.'}
      </Text>
      <AsyncBoundary loading={loading} error={error} hasData={!!m} onRetry={reload} skeletonRows={5}>
        {m === null ? <EmptyState icon="apps-outline" title="Module not found" message="This module isn't on Ruxstar any more." /> : null}
        {m ? (
          <>
            <ModuleCore m={m} onSaved={setData} />
            {m.payouts ? (
              <>
                <Section>Withdrawals</Section>
                <Card>
                  <Withdrawals m={{ ...m, payouts: m.payouts }} onSaved={setData} />
                </Card>
              </>
            ) : null}
            {m.delivery ? (
              <>
                <Section>Delivery rates</Section>
                <Card>
                  <DeliveryRates m={{ ...m, delivery: m.delivery }} onSaved={setData} />
                </Card>
              </>
            ) : null}
            {m.eventRules || m.coachingRules || m.turfRules ? (
              <Card>
                {m.eventRules ? <RulesForm m={m} kind="eventRules" onSaved={setData} /> : null}
                {m.coachingRules ? <RulesForm m={m} kind="coachingRules" onSaved={setData} /> : null}
                {m.turfRules ? <RulesForm m={m} kind="turfRules" onSaved={setData} /> : null}
              </Card>
            ) : null}
            {isGstModule(module) ? (
              <>
                <Section>GST</Section>
                <Card>
                  <ListRow
                    icon="calculator-outline"
                    title="GST rates and invoices"
                    subtitle={`Rates, codes and who invoices for ${MODULE_LABEL[module]}`}
                    onPress={() => router.push({ pathname: '/(admin)/gst', params: { module } })}
                  />
                </Card>
              </>
            ) : null}
          </>
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

/** One module: its switches, commission and fee, its rules, and a way to its GST settings. */
export function ModuleScreen({ module }: { module: string | undefined }) {
  const router = useRouter();
  if (isModuleName(module)) return <Settings module={module} />;
  return (
    <ScreenContainer title="Module">
      <EmptyState icon="apps-outline" title="Module not found" message="This link doesn't point to a Ruxstar module." actionLabel="See all modules" onAction={() => router.replace('/(admin)/modules')} />
    </ScreenContainer>
  );
}
