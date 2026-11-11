import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { BUSINESS_MODULES, MISSING_LABEL, listOf, statusOf } from '@/features/vendor/lib/business-modules';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import { AdminService } from '@/services/admin-service';
import type { BusinessCase } from '@/types/admin';
import { useCan } from '../access';
import { Card, Fact, Facts, Note, ReasonSheet, consoleStyles, errorText } from '../components/parts';
import { shortDate } from '../labels';

function Actions({ c, onChanged }: { c: BusinessCase; onChanged: (next: BusinessCase, message: string) => void }) {
  const token = useAuthToken();
  const canManage = useCan('businesses.manage');
  const [holding, setHolding] = useState(false);
  const [busy, setBusy] = useState<'hold' | 'restore' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const keys = useRef({ hold: newIdempotencyKey(), restore: newIdempotencyKey() });
  if (!canManage) return null;

  const run = async (kind: 'hold' | 'restore', reason = '') => {
    setBusy(kind);
    setError(null);
    try {
      const k = keys.current[kind];
      const next = kind === 'hold' ? await AdminService.holdBusiness(token, c.business.id, reason, k) : await AdminService.restoreBusiness(token, c.business.id, k);
      keys.current[kind] = newIdempotencyKey();
      Feedback.success();
      setHolding(false);
      onChanged(next, kind === 'hold' ? 'Business put on hold. The vendor has been told why.' : 'Hold lifted. The vendor has been told.');
    } catch (err) {
      Feedback.error();
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.actions}>
      {error ? <ErrorBanner message={error} /> : null}
      {c.business.suspension ? (
        <PrimaryButton label="Lift the hold" onPress={() => run('restore')} loading={busy === 'restore'} disabled={!!busy} />
      ) : (
        <PrimaryButton label="Put on hold" variant="outline" onPress={() => setHolding(true)} disabled={!!busy} />
      )}
      <ReasonSheet
        visible={holding}
        title="Put this business on hold"
        prompt="Customers stop seeing it and the vendor can't change it. They will see this reason."
        placeholder="For example: the photos show another shop. Upload your own."
        confirmLabel="Put on hold"
        loading={busy === 'hold'}
        onConfirm={(reason) => run('hold', reason)}
        onCancel={() => setHolding(false)}
      />
    </View>
  );
}

/** One business for the Ruxstar team: what customers see, who runs it, where they are paid. */
export function BusinessCaseScreen({ id }: { id: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const canSeePeople = useCan('users.view');
  const canAudit = useCan('audit.view');
  const { data, loading, error, reload, setData } = useAsyncResource(() => AdminService.getBusiness(token, id), id);
  const [done, setDone] = useState<string | null>(null);

  return (
    <ScreenContainer title="Business">
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={5}>
        {data ? (
          <>
            <View style={styles.head}>
              <View style={styles.flex}>
                <Text style={styles.name}>{data.business.name}</Text>
                <Text style={consoleStyles.muted}>{BUSINESS_MODULES[data.business.module].label}</Text>
              </View>
              <Badge {...statusOf(data.business)} />
            </View>

            {done ? <Note>{done}</Note> : null}
            {data.business.suspension ? (
              <Note tone="danger">
                On hold {timeAgo(data.business.suspension.at)}
                {data.suspendedBy ? ` by ${data.suspendedBy.name}` : ''}: {data.business.suspension.reason}
              </Note>
            ) : null}

            {data.business.photos.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
                {data.business.photos.map((p) => (
                  <Image key={p.id} source={{ uri: p.url }} style={styles.photo} contentFit="cover" transition={150} />
                ))}
              </ScrollView>
            ) : null}

            <Card>
              <Facts>
                <Fact label="About" value={data.business.description ?? '—'} />
                <Fact label="Phone" value={data.business.phone ?? '—'} />
                <Fact label="Email" value={data.business.email ?? '—'} />
                <Fact
                  label="Address"
                  value={
                    data.business.address
                      ? [data.business.address.line1, data.business.address.line2, data.business.address.city, data.business.address.state, data.business.address.pincode]
                          .filter(Boolean)
                          .join(', ')
                      : '—'
                  }
                />
                <Fact
                  label="GSTIN"
                  value={data.business.gstin ? `${data.business.gstin.number}${data.business.gstin.status ? ` (${data.business.gstin.status})` : ''}` : 'Not given'}
                />
                {data.business.status === 'draft' && data.business.missing.length ? (
                  <Fact label="Missing to publish" value={listOf(data.business.missing.map((m) => MISSING_LABEL[m]))} warn />
                ) : null}
                <Fact label="Published" value={data.business.publishedAt ? shortDate(data.business.publishedAt) : 'Not yet'} />
                <Fact label="Created" value={shortDate(data.business.createdAt)} />
                <Fact label="Business id" value={data.business.id} />
              </Facts>
            </Card>

            <Card>
              <Facts>
                <Fact label="Vendor" value={data.owner ? `${data.owner.name || 'No name'} (@${data.owner.username})` : 'Account gone'} warn={!data.owner || data.owner.status !== 'active'} />
                {data.owner ? <Fact label="Vendor phone" value={data.owner.phone} /> : null}
                <Fact
                  label="Paid to"
                  value={data.payoutMethod ? `${data.payoutMethod.label}${data.payoutMethod.holderName ? ` · ${data.payoutMethod.holderName}` : ''}` : 'Not set up'}
                  warn={!data.payoutMethod}
                />
              </Facts>
            </Card>

            <Actions
              c={data}
              onChanged={(next, message) => {
                setData(next);
                setDone(message);
              }}
            />

            <View style={styles.links}>
              {data.owner && canSeePeople ? (
                <TextLink label="Open the vendor's account" onPress={() => router.push({ pathname: '/(admin)/account/[id]', params: { id: data.owner!.id } })} />
              ) : null}
              {canAudit ? <TextLink label="History for this business" onPress={() => router.push({ pathname: '/(admin)/audit', params: { target: data.business.id } })} /> : null}
            </View>
          </>
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  name: { ...Typography.title, color: Brand.text },
  photos: { gap: Spacing.two },
  photo: { width: 140, height: 140, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  actions: { gap: Spacing.two, marginTop: Spacing.two },
  links: { gap: Spacing.three, alignItems: 'flex-start', marginTop: Spacing.two },
});
