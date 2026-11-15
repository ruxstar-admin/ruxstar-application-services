import { useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { ShopCover } from '@/features/pod/components/ShopCover';
import { ratingLine } from '@/features/reviews/lib/review';
import { PRODUCT_STATUS } from '@/features/store/lib/store';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { ConsoleStoreService } from '@/services/store-service';
import { useCan } from '../access';
import { Card, Fact, Facts, Note, ReasonSheet, Section, consoleStyles, errorText } from '../components/parts';
import { shortDate } from '../labels';

/** One local shop product for the Ruxstar team: its variants, stock and tax, and taking it down. */
export function StoreProductCaseScreen({ id }: { id: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const { width } = useWindowDimensions();
  const canManage = useCan('businesses.manage');
  const canAudit = useCan('audit.view');
  const { data: product, loading, error, reload, setData } = useAsyncResource(() => ConsoleStoreService.product(token, id), id);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());

  const takeDown = async (reason: string) => {
    setBusy(true);
    setFailure(null);
    try {
      setData(await ConsoleStoreService.takeDown(token, id, reason, key.current));
      key.current = newIdempotencyKey();
      Feedback.success();
      setOpen(false);
      setDone('Product taken down. The shop has been told why. Orders already placed carry on.');
    } catch (err) {
      Feedback.error();
      setOpen(false);
      setFailure(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer title="Shop product">
      <AsyncBoundary loading={loading} error={error} hasData={!!product} onRetry={reload} skeletonRows={5}>
        {product ? (
          <>
            <ShopCover photo={product.photo ? { ...product.photo, smaller: [] } : null} name={product.title} width={width - Spacing.three * 2} style={styles.photo} />
            <View style={styles.head}>
              <View style={styles.flex}>
                <Text style={styles.name}>{product.title}</Text>
                <Text style={consoleStyles.muted}>{`${product.business.name} · ${product.city}`}</Text>
              </View>
              <Badge {...PRODUCT_STATUS[product.status]} />
            </View>
            {done ? <Note>{done}</Note> : null}
            {product.removal ? <Note tone="danger">{`Taken down by Ruxstar on ${shortDate(product.removal.at)}: ${product.removal.reason}`}</Note> : null}

            <Card>
              <Facts>
                <Fact label="Price" value={`${product.variants.length > 1 ? 'From ' : ''}${money(product.priceFrom)}${product.mrpFrom ? ` · MRP ${money(product.mrpFrom)}` : ''}`} />
                <Fact label="In stock" value={product.inStock ? `${product.variants.reduce((s, v) => s + v.stock, 0)} left` : 'Sold out'} warn={!product.inStock} />
                <Fact label="Rating" value={ratingLine(product.rating)} />
                <Fact label="Returns" value={product.returnRule} />
                <Fact label="HSN" value={product.hsn ?? 'Not set'} />
                <Fact label="GST" value={product.gstRateBps === null ? 'Module default' : `${product.gstRateBps / 100}%`} />
                <Fact label="Added" value={shortDate(product.createdAt)} />
                <Fact label="Product id" value={product.id} />
              </Facts>
            </Card>

            <Section>{product.options.length ? product.options.map((o) => o.name).join(' × ') : 'Variant'}</Section>
            <Card>
              {product.variants.map((v) => (
                <View key={v.id} style={styles.variant}>
                  <Text style={[consoleStyles.body, styles.flex]}>{v.values.length ? v.values.join(' / ') : 'The product'}</Text>
                  <Text style={consoleStyles.muted}>{`${money(v.price)}${v.mrp ? ` (MRP ${money(v.mrp)})` : ''} · ${v.stock} left${v.sku ? ` · ${v.sku}` : ''}`}</Text>
                </View>
              ))}
            </Card>

            {product.description ? (
              <Card>
                <Text style={consoleStyles.muted}>About</Text>
                <Text style={consoleStyles.body} selectable>
                  {product.description}
                </Text>
              </Card>
            ) : null}

            {failure ? <ErrorBanner message={failure} /> : null}
            {canManage && product.status !== 'removed' ? <PrimaryButton label="Take down" variant="outline" onPress={() => setOpen(true)} disabled={busy} /> : null}
            <View style={styles.links}>
              <TextLink label="Open the shop" onPress={() => router.push({ pathname: '/(admin)/store/[id]', params: { id: product.business.id } })} />
              {canAudit ? <TextLink label="History for this product" onPress={() => router.push({ pathname: '/(admin)/audit', params: { target: product.id } })} /> : null}
            </View>

            <ReasonSheet
              visible={open}
              title={`Take down ${product.title}?`}
              message="It leaves the shop for good. Orders already placed carry on. The shop sees your reason. This can’t be undone."
              prompt="Reason"
              placeholder="For example: this is a banned item."
              confirmLabel="Take down"
              loading={busy}
              onConfirm={takeDown}
              onCancel={() => setOpen(false)}
            />
          </>
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 1.6, borderRadius: Radius.lg, overflow: 'hidden' },
  flex: { flex: 1, gap: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  name: { ...Typography.title, color: Brand.text },
  variant: { gap: 2, paddingVertical: Spacing.one },
  links: { gap: Spacing.three, alignItems: 'flex-start', marginTop: Spacing.two },
});
