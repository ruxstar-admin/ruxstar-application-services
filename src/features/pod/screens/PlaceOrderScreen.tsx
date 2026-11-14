import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { CheckoutCoupons } from '@/features/coupons/components/CheckoutCoupons';
import { DropLocation } from '@/features/pod/components/DropLocation';
import { OrderPriceList } from '@/features/pod/components/OrderPriceList';
import { checkoutReturn, fileSize, requiredOption } from '@/features/pod/lib/order';
import { readyLine } from '@/features/pod/lib/shop';
import { money, OPTION_LABELS, titleCase } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { OrderService } from '@/services/order-service';
import { ProfileService } from '@/services/profile-service';
import { ShopService } from '@/services/shop-service';
import type { OrderAddress, PrintFile, Quote } from '@/types/order';
import type { Shop, ShopProduct } from '@/types/shop';

const FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 10;
const MAX_QUANTITY = 10_000;
const QUOTE_DELAY_MS = 350;

const digits = (text: string, max: number) => text.replace(/\D/g, '').slice(0, max);
const messageOf = (err: unknown) =>
  err instanceof ApiError && (err.kind === 'network' || err.kind === 'timeout')
    ? 'Check your connection and try again.'
    : err instanceof Error
      ? err.message
      : 'Something went wrong. Try again.';

/** Binding starts at "None"; paper size at A4. Everything else is the customer's call. */
function defaultsFor(product: ShopProduct): Record<string, string> {
  const picked: Record<string, string> = {};
  for (const { option, values } of product.options) {
    if (values.includes('None')) picked[option] = 'None';
    else if (option === 'paperSize' && values.includes('A4')) picked[option] = 'A4';
  }
  return picked;
}

const colourFor = (product: ShopProduct): 'bw' | 'color' | undefined =>
  product.pricing !== 'per_page' ? undefined : product.bw ? 'bw' : product.color ? 'color' : undefined;

function deliversTo(shop: Shop, city: string) {
  const name = city.trim().toLowerCase();
  return !name || shop.deliversEverywhere || shop.cities.includes(name) || shop.city.toLowerCase() === name;
}

function OptionPicker({
  product,
  option,
  values,
  value,
  onChange,
  invalid,
}: {
  product: ShopProduct;
  option: string;
  values: string[];
  value: string;
  onChange: (v: string) => void;
  /** Pay was tapped without choosing this required option. */
  invalid?: boolean;
}) {
  const required = option === requiredOption(product);
  const extra = (v: string) => product.extras.find((x) => x.option === option && x.value === v)?.price;
  const choices = [
    ...(required || values.includes('None') ? [] : [{ key: '', label: option === 'doubleSided' ? 'Single-sided' : 'Any' }]),
    ...values.map((v) => ({ key: v, label: extra(v) ? `${v} +${money(extra(v)!)}` : v })),
  ];
  return (
    <View style={styles.option}>
      <Text style={[styles.label, invalid && styles.invalid]}>
        {OPTION_LABELS[option] ?? option}
        {required ? <Text style={invalid ? styles.invalidSmall : styles.faint}>{invalid ? ' · choose one' : ' · required'}</Text> : null}
      </Text>
      <View style={styles.bleed}>
        <ChoiceChips options={choices} value={value} onChange={onChange} secondary />
      </View>
    </View>
  );
}

function OrderForm({ shop, initialProduct }: { shop: Shop; initialProduct?: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const [productId, setProductId] = useState(() => (shop.catalog.find((p) => p.id === initialProduct) ?? shop.catalog[0]!).id);
  const product = shop.catalog.find((p) => p.id === productId)!;
  const perPage = product.pricing === 'per_page';
  const [options, setOptions] = useState(() => defaultsFor(product));
  const [colour, setColour] = useState(() => colourFor(product));
  const [quantity, setQuantity] = useState(() => String(perPage ? 1 : product.minQuantity));
  const [files, setFiles] = useState<PrintFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [address, setAddress] = useState<OrderAddress>({ name: '', phone: '', line: '', city: shop.city, pincode: '' });
  const [note, setNote] = useState('');
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [priced, setPriced] = useState<{ key: string; quote: Quote | null; error: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  /** Set once Pay is tapped with something missing; from then on, what's missing shows in red. */
  const [checked, setChecked] = useState(false);
  const attempt = useRef(newIdempotencyKey());

  const qty = Number(quantity) || 0;
  const fileIds = files.map((f) => f.id);
  const needs = requiredOption(product);
  const missing = product.options.some((o) => o.option === needs) && !options[needs];

  // The last order's address, or the account's name, phone and city.
  useEffect(() => {
    let live = true;
    Promise.all([OrderService.list(token).catch(() => null), ProfileService.account(token).catch(() => null)]).then(([orders, me]) => {
      if (!live) return;
      const last = orders?.items[0]?.address;
      setAddress((now) =>
        now.name || now.phone || now.line
          ? now
          : last ?? { name: me?.name ?? '', phone: (me?.phone ?? '').replace(/\D/g, '').slice(-10), line: '', city: me?.city || shop.city, pincode: '' },
      );
    });
    return () => {
      live = false;
    };
  }, [token, shop.city]);

  // Only a per-km fee depends on where it goes; then the address counts once it can be found on the map.
  const byDistance = shop.deliveryFee.perKm > 0;
  const findable = !!address.point || (/^[1-9]\d{5}$/.test(address.pincode) && address.line.trim().length >= 5);
  const drop = byDistance && findable ? { line: address.line.trim(), city: address.city.trim(), pincode: address.pincode, point: address.point ?? null } : undefined;
  const choiceKey = JSON.stringify([productId, options, colour, qty, fileIds, couponCode, drop]);
  const priceable = !missing && qty >= 1 && !(perPage && !colour);
  const current = priceable && priced?.key === choiceKey ? priced : null;
  const quote = current?.quote ?? null;
  const quoteError = current?.error ?? null;
  /** The offers stay on screen while a new price loads, so the list doesn't jump. */
  const offers = priceable ? (priced?.quote?.offers ?? null) : null;
  useEffect(() => {
    attempt.current = newIdempotencyKey();
    if (!priceable) return;
    let live = true;
    const timer = setTimeout(() => {
      OrderService.quote(token, { shopId: shop.id, product: productId, options, colour, quantity: qty, fileIds, couponCode: couponCode ?? undefined, address: drop })
        .then((q) => live && setPriced({ key: choiceKey, quote: q, error: null }))
        .catch((err) => live && setPriced({ key: choiceKey, quote: null, error: messageOf(err) }));
    }, QUOTE_DELAY_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
    // choiceKey covers every input to the quote.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choiceKey, token]);

  const pick = (id: ShopProduct['id']) => {
    const next = shop.catalog.find((p) => p.id === id)!;
    setProductId(id);
    setOptions(defaultsFor(next));
    setColour(colourFor(next));
    setQuantity(String(next.pricing === 'per_page' ? 1 : next.minQuantity));
  };

  const addFile = async () => {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({ type: FILE_TYPES, copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_FILE_BYTES) {
      setError('Files can be up to 25 MB. Compress it or split it and try again.');
      return;
    }
    setUploading(true);
    try {
      const file = await OrderService.upload(token, { uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
      setFiles((now) => [...now, file]);
      Feedback.success();
    } catch (err) {
      setError(messageOf(err));
      Feedback.error();
    } finally {
      setUploading(false);
    }
  };

  const set = (field: keyof OrderAddress) => (text: string) =>
    setAddress((now) => ({ ...now, [field]: field === 'phone' ? digits(text, 10) : field === 'pincode' ? digits(text, 6) : text }));
  const cityOk = deliversTo(shop, address.city);
  const fieldErrors: Partial<Record<keyof OrderAddress, string>> = {
    ...(address.name.trim().length < 2 ? { name: 'Enter the name to deliver to' } : {}),
    ...(!/^[6-9]\d{9}$/.test(address.phone) ? { phone: 'Enter a 10-digit mobile number' } : {}),
    ...(address.line.trim().length < 5 ? { line: 'Enter the house, street and area' } : {}),
    ...(address.city.trim().length < 2 ? { city: 'Enter the city' } : {}),
    ...(!/^[1-9]\d{5}$/.test(address.pincode) ? { pincode: 'Enter the 6-digit pincode' } : {}),
  };
  const addressOk = Object.keys(fieldErrors).length === 0 && cityOk;
  const filled = files.length > 0 && !missing && qty >= 1 && !(perPage && !colour) && addressOk;
  const ready = !!quote && filled && shop.open && !uploading;
  const show = (message: string | undefined) => (checked ? message : undefined);

  const place = async () => {
    if (!filled) {
      setChecked(true);
      Feedback.error();
      return;
    }
    if (!ready) {
      if (quoteError) setError(quoteError);
      return;
    }
    setPlacing(true);
    setError(null);
    try {
      const { order } = await OrderService.place(
        token,
        {
          shopId: shop.id,
          product: productId,
          options,
          colour,
          quantity: qty,
          fileIds,
          address: { ...address, name: address.name.trim(), line: address.line.trim(), city: address.city.trim() },
          note: note.trim() || undefined,
          couponCode: quote?.coupon?.code,
          returnTo: checkoutReturn(),
        },
        { idempotencyKey: attempt.current },
      );
      Feedback.success();
      router.replace({ pathname: '/(customer)/pod/order/[id]', params: { id: order.id, pay: '1' } });
    } catch (err) {
      setError(messageOf(err));
      Feedback.error();
    } finally {
      setPlacing(false);
    }
  };

  const hint = !files.length
    ? 'Add the file to print'
    : missing
      ? `Choose a ${needs === 'size' ? 'size' : 'paper size'}`
      : !addressOk
        ? 'Fill in the delivery address'
        : null;

  return (
    <ScreenContainer
      title="Place order"
      footer={
        <>
          {error ? <ErrorBanner message={error} /> : checked && !filled ? <ErrorBanner message="Fill in the fields marked in red to pay." /> : null}
          <View style={styles.bar}>
            <View style={styles.flex}>
              {quote ? (
                <Text style={styles.total}>{money(quote.total)}</Text>
              ) : priceable && !quoteError ? (
                <ActivityIndicator color={Brand.primarySoft} style={styles.totalLoading} accessibilityLabel="Working out the price" />
              ) : (
                <Text style={styles.total}>—</Text>
              )}
              <Text style={styles.faint}>{!shop.open ? 'This shop is closed right now' : (hint ?? readyLine(quote?.turnaroundDays ?? product.turnaroundDays))}</Text>
            </View>
            <View style={styles.payButton}>
              <PrimaryButton label="Pay" onPress={place} loading={placing} disabled={!shop.open || uploading} />
            </View>
          </View>
        </>
      }
    >
      <Text style={styles.shop}>{shop.name}</Text>

      <Text style={styles.overline}>What to print</Text>
      <View style={styles.bleed}>
        <ChoiceChips options={shop.catalog.map((p) => ({ key: p.id, label: p.label }))} value={productId} onChange={pick} />
      </View>

      {product.options.map(({ option, values }) => (
        <OptionPicker
          key={`${productId}-${option}`}
          product={product}
          option={option}
          values={values}
          value={options[option] ?? ''}
          invalid={checked && option === needs && missing}
          onChange={(v) =>
            setOptions((now) => {
              const next = { ...now };
              if (v) next[option] = v;
              else delete next[option];
              return next;
            })
          }
        />
      ))}

      {perPage ? (
        <View style={styles.option}>
          <Text style={[styles.label, checked && !colour && styles.invalid]}>
            Print in
            {checked && !colour ? <Text style={styles.invalidSmall}> · choose one</Text> : null}
          </Text>
          <View style={styles.bleed}>
            <ChoiceChips
              secondary
              value={colour ?? ''}
              onChange={(v) => setColour(v as 'bw' | 'color')}
              options={[
                ...(product.bw ? [{ key: 'bw', label: `Black & white · ${money(product.bw)} a page` }] : []),
                ...(product.color ? [{ key: 'color', label: `Colour · ${money(product.color)} a page` }] : []),
              ]}
            />
          </View>
        </View>
      ) : null}

      <InputField
        label={perPage ? 'Copies' : 'Quantity'}
        value={quantity}
        onChangeText={(t) => setQuantity(String(Math.min(MAX_QUANTITY, Number(digits(t, 5)) || 0) || ''))}
        keyboardType="number-pad"
        error={show(qty < 1 ? `Enter how many ${perPage ? 'copies' : 'you want'}` : undefined)}
        hint={product.minQuantity > 1 ? `Minimum ${product.minQuantity}${perPage ? ' pages' : ''}` : perPage ? 'Every page of your files, this many times' : undefined}
      />

      <Text style={styles.overline}>Your files</Text>
      {files.map((file) => (
        <View key={file.id} style={styles.file}>
          <Ionicons name={file.contentType === 'application/pdf' ? 'document-text-outline' : 'image-outline'} size={22} color={Brand.primarySoft} />
          <View style={styles.flex}>
            <Text style={styles.fileName} numberOfLines={1}>
              {file.name}
            </Text>
            <Text style={styles.faint}>{`${file.pages} ${file.pages === 1 ? 'page' : 'pages'} · ${fileSize(file.bytes)}`}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${file.name}`}
            hitSlop={10}
            onPress={() => {
              Feedback.tap();
              setFiles((now) => now.filter((f) => f.id !== file.id));
            }}
          >
            <Ionicons name="close" size={20} color={Brand.textMuted} />
          </Pressable>
        </View>
      ))}
      {files.length < MAX_FILES ? (
        <Pressable accessibilityRole="button" onPress={addFile} disabled={uploading} style={[styles.addFile, checked && !files.length && styles.addFileInvalid]}>
          {uploading ? <ActivityIndicator color={Brand.primarySoft} /> : <Ionicons name="cloud-upload-outline" size={22} color={checked && !files.length ? Brand.error : Brand.primarySoft} />}
          <View style={styles.flex}>
            <Text style={styles.fileName}>{uploading ? 'Uploading…' : files.length ? 'Add another file' : 'Add a file'}</Text>
            <Text style={checked && !files.length ? styles.invalidSmall : styles.faint}>
              {checked && !files.length ? 'Add the file you want printed.' : 'PDF, JPG or PNG, up to 25 MB. Only this shop can open it.'}
            </Text>
          </View>
        </Pressable>
      ) : null}

      <Text style={styles.overline}>Deliver to</Text>
      <InputField label="Name" value={address.name} onChangeText={set('name')} maxLength={80} autoComplete="name" error={show(fieldErrors.name)} />
      <InputField label="Phone" value={address.phone} onChangeText={set('phone')} keyboardType="phone-pad" maxLength={10} autoComplete="tel" error={show(fieldErrors.phone)} />
      <InputField label="House, street and area" value={address.line} onChangeText={set('line')} maxLength={300} multiline error={show(fieldErrors.line)} />
      <DropLocation
        point={address.point ?? null}
        onLocated={(point, found) =>
          setAddress((now) => ({
            ...now,
            point,
            line: now.line.trim() ? now.line : (found.line ?? now.line),
            city: found.city && !now.city.trim() ? found.city : now.city,
            pincode: now.pincode || found.pincode || '',
          }))
        }
        onClear={() => setAddress((now) => ({ ...now, point: null }))}
      />
      <View style={styles.pair}>
        <View style={styles.flex}>
          <InputField
            label="City"
            value={address.city}
            onChangeText={set('city')}
            maxLength={60}
            error={cityOk ? show(fieldErrors.city) : `${shop.name} delivers to ${shop.cities.map(titleCase).join(', ') || shop.city} only`}
          />
        </View>
        <View style={styles.pin}>
          <InputField label="Pincode" value={address.pincode} onChangeText={set('pincode')} keyboardType="number-pad" maxLength={6} error={show(fieldErrors.pincode)} />
        </View>
      </View>
      <InputField label="Note for the shop" value={note} onChangeText={setNote} maxLength={500} multiline showCount placeholder="Optional: colours, placement, deadline…" />

      {priceable ? (
        <>
          <Text style={styles.overline}>Offers</Text>
          <CheckoutCoupons
            offers={offers}
            applied={quote?.coupon ?? null}
            discount={quote?.discount ?? 0}
            problem={quote?.couponProblem ?? null}
            onApply={setCouponCode}
            onRemove={() => setCouponCode(null)}
          />
        </>
      ) : null}

      <Text style={styles.overline}>Price</Text>
      <View style={styles.card}>
        {quote ? (
          <OrderPriceList price={quote} pricing={product.pricing} />
        ) : (
          <Text style={quoteError ? styles.error : styles.faint}>{quoteError ?? (missing ? `Choose a ${needs === 'size' ? 'size' : 'paper size'} to see the price.` : 'Working out the price…')}</Text>
        )}
      </View>
    </ScreenContainer>
  );
}

/** Ordering from a print shop: what to print, the file, where to deliver, then payment on Cashfree. */
export function PlaceOrderScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { shopId, product } = useLocalSearchParams<{ shopId: string; product?: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => ShopService.get(token, shopId));

  if (data?.catalog.length) return <OrderForm shop={data} initialProduct={product} />;
  if (data) {
    return (
      <ScreenContainer title="Place order">
        <EmptyState icon="pricetags-outline" title="Nothing to order yet" message="This shop has not priced anything yet." actionLabel="Back to the shop" onAction={() => router.back()} />
      </ScreenContainer>
    );
  }
  return (
    <ScreenContainer title="Place order">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={5}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shop: { ...Typography.title, color: Brand.text, marginBottom: Spacing.one },
  overline: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.three },
  label: { ...Typography.bodyStrong, fontSize: 14, color: Brand.text },
  faint: { ...Typography.caption, fontSize: 12, color: Brand.textFaint },
  error: { ...Typography.caption, color: Brand.error },
  invalid: { color: Brand.error },
  invalidSmall: { ...Typography.caption, fontSize: 12, color: Brand.error },
  option: { gap: Spacing.two, marginTop: Spacing.one },
  /** Chips scroll edge to edge past the screen padding. */
  bleed: { marginHorizontal: -Spacing.three },
  file: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  fileName: { ...Typography.bodyStrong, fontSize: 14, color: Brand.text },
  addFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Brand.primary,
  },
  addFileInvalid: { borderColor: Brand.error },
  pair: { flexDirection: 'row', gap: Spacing.two },
  pin: { width: 130 },
  card: { padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  bar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  total: { ...Typography.title, color: Brand.text },
  totalLoading: { alignSelf: 'flex-start', height: 32 },
  payButton: { width: 150 },
});
