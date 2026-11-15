import { Text } from 'react-native';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { GstService } from '@/services/invoice-service';
import { useCan } from '../access';
import { GstModuleCard } from '../components/GstModuleCard';
import { GstSellerCard } from '../components/GstSellerCard';
import { Section, consoleStyles } from '../components/parts';
import { GST_MODULE_LABEL } from '../labels';
import { isGstModule } from '../lib/modules';

/**
 * Ruxstar's own GST details and each module's GST rules. Changes apply to orders paid from then on.
 * Opened from a module's screen (`module`), it shows only that module's rules.
 */
export function GstSettingsScreen({ module }: { module?: string }) {
  const token = useAuthToken();
  const canManage = useCan('modules.manage');
  const only = isGstModule(module) ? module : null;
  const { data, loading, error, reload, setData } = useAsyncResource(() => GstService.settings(token));

  return (
    <ScreenContainer title={only ? `GST · ${GST_MODULE_LABEL[only]}` : 'GST'}>
      <Text style={consoleStyles.muted}>
        {canManage
          ? 'Changes apply to orders paid from now on and are written to the audit log. Documents already issued never change.'
          : 'You can see these settings. Ask an admin to change them.'}
      </Text>
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload}>
        {data ? (
          <>
            {only ? null : (
              <>
                <GstSellerCard s={data.seller} onSaved={(seller) => setData((prev) => ({ ...(prev ?? data), seller }))} />
                <Section>Modules</Section>
              </>
            )}
            {data.modules.filter((m) => !only || m.module === only).map((m) => (
              <GstModuleCard
                key={m.module}
                m={m}
                onSaved={(done) =>
                  setData((prev) => {
                    const now = prev ?? data;
                    return { ...now, modules: now.modules.map((x) => (x.module === done.module ? done : x)) };
                  })
                }
              />
            ))}
          </>
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}
