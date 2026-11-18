import { Text, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { AdminService } from '@/services/admin-service';
import type { ModuleName, StatsModule } from '@/types/admin';
import { useCan } from '../access';
import { DeliveryRates, ModuleCore, Withdrawals } from '../components/ModuleForms';
import { ModuleStats } from '../components/ModuleStats';
import { GigCategoriesForm } from '../components/GigCategoriesForm';
import { Card, Section, consoleStyles } from '../components/parts';
import { RulesForm } from '../components/RulesForm';
import { cellWidth, tileCardInner } from '../components/tiles';
import { MODULE_LABEL } from '../labels';
import { isGstModule, isModuleName } from '../lib/modules';
import { asOfText, blockEmpty, isStatsModule } from '../lib/stats';

/** The module's own numbers; nothing while they load or when this person may see none of them. */
function Numbers({ module }: { module: StatsModule }) {
  const token = useAuthToken();
  const { width } = useWindowDimensions();
  const { data } = useAsyncResource(() => AdminService.stats(token, module), `stats-${module}`);
  const block = data?.modules.find((b) => b.module === module);
  if (!data || !block || blockEmpty(block)) return null;
  return (
    <>
      <ModuleStats block={block} cell={cellWidth(tileCardInner(width), width < 340 ? 2 : 3)} title="Numbers" unlinked={module === 'delivery'} />
      <Text style={consoleStyles.muted}>{asOfText(data.asOf)}.</Text>
    </>
  );
}

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
            {isStatsModule(module) ? <Numbers module={module} /> : null}
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
            {m.eventRules || m.coachingRules || m.turfRules || m.staysRules || m.shopRules || m.gigsRules ? (
              <Card>
                {m.eventRules ? <RulesForm m={m} kind="eventRules" onSaved={setData} /> : null}
                {m.coachingRules ? <RulesForm m={m} kind="coachingRules" onSaved={setData} /> : null}
                {m.turfRules ? <RulesForm m={m} kind="turfRules" onSaved={setData} /> : null}
                {m.staysRules ? <RulesForm m={m} kind="staysRules" onSaved={setData} /> : null}
                {m.shopRules ? <RulesForm m={m} kind="shopRules" onSaved={setData} /> : null}
                {m.gigsRules ? <RulesForm m={m} kind="gigsRules" onSaved={setData} /> : null}
              </Card>
            ) : null}
            {m.gigsRules ? (
              <Card>
                <GigCategoriesForm m={{ ...m, gigsRules: m.gigsRules }} onSaved={setData} />
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
