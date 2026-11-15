import { useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Notice, Section } from '@/features/coaching/components/Parts';
import { errorText, isOffline } from '@/features/events/lib/messages';
import { ShopCover } from '@/features/pod/components/ShopCover';
import { pickSquarePhoto, toUploadJpeg } from '@/features/profile/lib/profile-photo';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { StoreDeskService, VendorStoreService } from '@/services/store-service';
import type { ProductOption, ProductPatch, VendorProduct } from '@/types/store';
import { OptionsEditor } from '../components/OptionsEditor';
import { VariantTable } from '../components/VariantTable';
import { useDeskStore } from '../hooks/use-desk-store';
import { useStoreRules } from '../hooks/use-store-rules';
import { rememberedProduct } from '../lib/desk-products';
import { rowsOf, syncRows, tableChanged, tableProblem, variantsOf, type VariantRow } from '../lib/variants';

const PHOTO_SIDE = 1600;
const GST = [
  { key: '', label: 'Default' },
  { key: '0', label: '0%' },
  { key: '5', label: '5%' },
  { key: '12', label: '12%' },
  { key: '18', label: '18%' },
  { key: '28', label: '28%' },
] as const;
type Gst = (typeof GST)[number]['key'];

const gstOf = (bps: number | null | undefined): Gst => (bps === null || bps === undefined ? '' : (GST.find((g) => g.key !== '' && Number(g.key) * 100 === bps)?.key ?? ''));
const cleanOptions = (options: readonly ProductOption[]) => options.map((o) => ({ name: o.name.trim(), values: o.values }));

function Form({ storeId, product, owner }: { storeId: string; product: VendorProduct | null; owner: boolean }) {
  const router = useRouter();
  const token = useAuthToken();
  const rules = useStoreRules();
  const { width } = useWindowDimensions();
  const [saved, setSaved] = useState(product);
  const [title, setTitle] = useState(product?.title ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [hsn, setHsn] = useState(product?.hsn ?? '');
  const [gst, setGst] = useState<Gst>(gstOf(product?.gstRateBps));
  const [live, setLive] = useState(product ? product.status === 'live' : true);
  const [options, setOptions] = useState<ProductOption[]>(product?.options ?? []);
  const [rows, setRows] = useState<VariantRow[]>(() => (product ? rowsOf(product) : syncRows([], [])));
  const [photo, setPhoto] = useState<ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const createKey = useRef(newIdempotencyKey());
  const removed = saved?.status === 'removed';

  const changeOptions = (next: ProductOption[]) => {
    setOptions(next);
    setRows((now) => syncRows(next, now));
  };

  const clean = cleanOptions(options);
  const problem =
    title.trim().length < 2
      ? 'Give the product a name, at least 2 letters.'
      : hsn.trim() && !/^\d{4,8}$/.test(hsn.trim())
        ? 'The HSN code is 4 to 8 digits.'
        : tableProblem(clean, rows, rules);

  const pickPhoto = async () => {
    const asset = await pickSquarePhoto();
    if (!asset) return;
    if (!saved) {
      setPhoto(asset);
      return;
    }
    setBusy('photo');
    setFailure(null);
    try {
      setSaved(await VendorStoreService.setPhoto(token, saved.id, await toUploadJpeg(asset, PHOTO_SIDE, 1)));
      Feedback.success();
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
    } finally {
      setBusy(null);
    }
  };
  const dropPhoto = async () => {
    if (!saved) {
      setPhoto(null);
      return;
    }
    setBusy('photo');
    setFailure(null);
    try {
      setSaved(await VendorStoreService.removePhoto(token, saved.id));
      Feedback.success();
    } catch (err) {
      setFailure(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    setChecked(true);
    if (problem) {
      Feedback.error();
      return;
    }
    setBusy('save');
    setFailure(null);
    const words = {
      title: title.trim(),
      description: description.trim() || null,
      hsn: hsn.trim() || null,
      gstRateBps: gst === '' ? null : Number(gst) * 100,
      ...(removed ? {} : { status: live ? ('live' as const) : ('hidden' as const) }),
    };
    try {
      if (!saved) {
        const made = await VendorStoreService.create(
          token,
          storeId,
          { ...words, ...(clean.length ? { options: clean } : {}), variants: variantsOf(rows) },
          { idempotencyKey: createKey.current },
        );
        if (photo) await VendorStoreService.setPhoto(token, made.id, await toUploadJpeg(photo, PHOTO_SIDE, 1)).catch(() => undefined);
      } else {
        const patch: ProductPatch = {
          ...(words.title !== saved.title ? { title: words.title } : {}),
          ...(words.description !== saved.description ? { description: words.description } : {}),
          ...(words.hsn !== saved.hsn ? { hsn: words.hsn } : {}),
          ...(words.gstRateBps !== saved.gstRateBps ? { gstRateBps: words.gstRateBps } : {}),
          ...(words.status && words.status !== saved.status ? { status: words.status } : {}),
          ...(tableChanged(saved, clean, rows) ? { options: clean, variants: variantsOf(rows) } : {}),
        };
        if (Object.keys(patch).length) await (owner ? VendorStoreService.update(token, saved.id, patch) : StoreDeskService.update(token, saved.id, patch));
      }
      Feedback.success();
      router.back();
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
      if (!saved && !isOffline(err)) createKey.current = newIdempotencyKey();
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!saved) return;
    setBusy('delete');
    try {
      await VendorStoreService.remove(token, saved.id);
      Feedback.success();
      setDeleting(false);
      router.back();
    } catch (err) {
      Feedback.error();
      setDeleting(false);
      setFailure(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const shownPhoto = saved?.photo ? { ...saved.photo, smaller: [] } : photo ? { url: photo.uri, width: photo.width, height: photo.height, smaller: [] } : null;
  const footer = <PrimaryButton label={saved ? 'Save changes' : 'Add product'} onPress={save} loading={busy === 'save'} disabled={!!busy} />;

  return (
    <ScreenContainer title={saved ? 'Edit product' : 'New product'} footer={footer}>
      {removed ? <Notice tone="error" text={`Ruxstar took this down${saved?.removal ? `: ${saved.removal.reason}` : ''}. It can’t go back on sale.`} /> : null}

      {owner ? (
        <>
          <ShopCover photo={shownPhoto} name={title || 'Product'} width={width - Spacing.three * 2} style={styles.photo} />
          <View style={styles.links}>
            <TextLink label={shownPhoto ? 'Change photo' : 'Add a photo'} onPress={() => void pickPhoto()} />
            {shownPhoto ? <TextLink label="Remove photo" muted onPress={() => void dropPhoto()} /> : null}
          </View>
          <Text style={styles.small}>One square photo on a plain background sells best.</Text>
        </>
      ) : null}

      <InputField label="Name" value={title} onChangeText={setTitle} maxLength={120} placeholder="Like Cotton kurta" error={checked && title.trim().length < 2 ? 'Enter a name' : undefined} />
      <InputField label="Description (optional)" value={description} onChangeText={setDescription} maxLength={2000} multiline placeholder="Material, size guide, care" />

      <Section title="Options" />
      <Text style={styles.small}>{`Sell it in sizes or colours? Add up to ${rules.maxOptions} options. Each mix gets its own price and stock.`}</Text>
      <OptionsEditor options={options} onChange={changeOptions} maxOptions={rules.maxOptions} maxValues={rules.maxValues} />

      <Section title={clean.length ? 'Prices and stock for each' : 'Price and stock'} />
      <Text style={styles.small}>Price is what customers pay. MRP is optional; when it’s higher, it shows struck through.</Text>
      <VariantTable rows={rows} onChange={setRows} hasOptions={clean.length > 0} />

      <Section title="Tax" />
      <InputField label="HSN code (optional)" value={hsn} onChangeText={(t) => setHsn(t.replace(/\D/g, '').slice(0, 8))} keyboardType="number-pad" placeholder="For GST invoices" />
      <Text style={styles.label}>GST rate</Text>
      <View style={styles.bleed}>
        <ChoiceChips options={GST} value={gst} onChange={setGst} />
      </View>

      {removed ? null : <ToggleRow title="On sale" subtitle={live ? 'Customers can buy it.' : 'Hidden from customers until you turn it on.'} value={live} onValueChange={setLive} />}

      {checked && problem ? <ErrorBanner message={problem} /> : null}
      {failure ? <ErrorBanner message={failure} /> : null}
      {saved && owner ? <TextLink label="Delete this product" muted onPress={() => setDeleting(true)} /> : null}

      <ConfirmSheet
        visible={deleting}
        title="Delete this product?"
        message="It goes from your shop. Orders already placed carry on."
        confirmLabel="Delete product"
        loading={busy === 'delete'}
        onConfirm={() => void remove()}
        onCancel={() => setDeleting(false)}
      />
    </ScreenContainer>
  );
}

/** Adding or changing a product: photo, name, options and the variant table, tax, and whether it's on sale. */
export function ProductFormScreen() {
  const token = useAuthToken();
  const { id, product: productId } = useLocalSearchParams<{ id: string; product?: string }>();
  const desk = useDeskStore(id);
  const owner = !!desk.store?.owner;
  const fromList = productId ? rememberedProduct(productId) : undefined;
  const loaded = useAsyncResource(
    () => (productId && owner ? VendorStoreService.get(token, productId) : Promise.resolve(null)),
    `${productId ?? 'new'}|${owner}`,
  );

  if (!desk.store) {
    return (
      <ScreenContainer title="Product">
        <AsyncBoundary loading={desk.loading} error={desk.error} hasData={false} onRetry={desk.reload} skeletonRows={4}>
          <EmptyState icon="lock-closed-outline" title="Not your shop" message="Only the owner and their team can change its products." />
        </AsyncBoundary>
      </ScreenContainer>
    );
  }
  if (!productId) return <Form storeId={id} product={null} owner={owner} />;
  const product = owner ? loaded.data : fromList;
  if (product) return <Form key={product.id} storeId={id} product={product} owner={owner} />;
  return (
    <ScreenContainer title="Product">
      {owner ? (
        <AsyncBoundary loading={!loaded.error} error={loaded.error} hasData={false} onRetry={loaded.reload} skeletonRows={4}>
          {null}
        </AsyncBoundary>
      ) : (
        <EmptyState icon="pricetags-outline" title="Open it from the list" message="Go back to products and stock, then tap the product to change it." />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 1, borderRadius: Radius.lg, overflow: 'hidden' },
  links: { flexDirection: 'row', gap: Spacing.four },
  small: { ...Typography.caption, color: Brand.textMuted },
  label: { ...Typography.bodyStrong, fontSize: 14, color: Brand.text },
  bleed: { marginHorizontal: -Spacing.three },
});
