import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PriceSummary } from '@/components/ui/PriceSummary';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Stepper } from '@/components/ui/Stepper';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { PaymentSheet } from '@/features/payments/components/PaymentSheet';
import { usePaidAction } from '@/features/payments/hooks/use-paid-action';
import { MAX_COPIES, quotePod } from '@/features/pod/lib/pricing';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { formatRupees } from '@/lib/money';
import { PodService } from '@/services/pod-service';
import type { Fulfilment, PaperSize, PrintShop, PrintSpecs } from '@/types/pod';

const PAPERS: readonly { key: PaperSize; label: string }[] = [
  { key: 'A4', label: 'A4' },
  { key: 'A3', label: 'A3' },
  { key: 'Letter', label: 'Letter' },
];
const FULFILMENT = [
  { key: 'pickup', label: 'Pickup' },
  { key: 'delivery', label: 'Delivery' },
] as const;

const MIN_ADDRESS = 10;

interface Upload {
  name: string;
  fileId: string;
  pages: number;
}

function OrderForm({ shop }: { shop: PrintShop }) {
  const router = useRouter();
  const token = useAuthToken();
  const [upload, setUpload] = useState<Upload | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [paper, setPaper] = useState<PaperSize>('A4');
  const [color, setColor] = useState(false);
  const [doubleSided, setDoubleSided] = useState(false);
  const [copies, setCopies] = useState(1);
  const [fulfilment, setFulfilment] = useState<Fulfilment>('pickup');
  const [address, setAddress] = useState('');

  const specs: PrintSpecs | null = upload ? { paper, color, doubleSided, copies, pages: upload.pages } : null;
  const quote = specs ? quotePod(shop, specs, fulfilment) : null;
  const addressOk = fulfilment === 'pickup' || address.trim().length >= MIN_ADDRESS;
  const ready = !!upload && addressOk;

  const pickFile = async () => {
    const picked = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*', 'application/msword'], copyToCacheDirectory: true });
    if (picked.canceled) return;
    const file = picked.assets[0];
    setUploading(true);
    setUploadFailed(false);
    try {
      const saved = await PodService.upload(token, file.name, file.uri);
      Feedback.success();
      setUpload({ name: file.name, fileId: saved.fileId, pages: saved.pages });
    } catch {
      Feedback.error();
      setUploadFailed(true);
    } finally {
      setUploading(false);
    }
  };

  const checkout = usePaidAction((paymentRef) =>
    PodService.placeOrder(token, {
      shopId: shop.id,
      fileId: upload?.fileId ?? '',
      fileName: upload?.name ?? '',
      specs: specs as PrintSpecs,
      fulfilment,
      address: fulfilment === 'delivery' ? address.trim() : undefined,
      paymentRef: paymentRef ?? '',
    }),
  );

  const finish = () => {
    checkout.closeSheet();
    if (checkout.result) router.replace({ pathname: '/(customer)/pod/order/[id]', params: { id: checkout.result.id } });
  };

  return (
    <ScreenContainer
      title={shop.name}
      footer={
        <PrimaryButton
          label={quote ? `Pay ${formatRupees(quote.total)} & place order` : 'Add a file to continue'}
          disabled={!ready}
          onPress={checkout.openSheet}
        />
      }
    >
      <Text style={styles.meta}>{`${shop.area} · ★ ${shop.rating} · ${shop.turnaround}`}</Text>

      <Text style={styles.section}>1 · Your file</Text>
      <View style={styles.fileBox}>
        <Text style={styles.fileName} numberOfLines={1}>
          {upload ? upload.name : 'PDF, image or Word document'}
        </Text>
        {upload ? <Text style={styles.meta}>{`${upload.pages} pages detected`}</Text> : null}
        <PrimaryButton label={upload ? 'Change file' : 'Choose a file'} variant={upload ? 'outline' : 'primary'} onPress={pickFile} loading={uploading} />
        {uploadFailed ? <ErrorBanner message="Could not upload that file. Please try again." onRetry={pickFile} /> : null}
      </View>

      <Text style={styles.section}>2 · Print settings</Text>
      <ChoiceChips options={PAPERS} value={paper} onChange={setPaper} />
      <ToggleRow title="Colour printing" subtitle={`₹${shop.colorRate} per page instead of ₹${shop.bwRate}`} value={color} onValueChange={setColor} />
      <ToggleRow title="Double-sided" subtitle="Uses half the paper" value={doubleSided} onValueChange={setDoubleSided} />
      <View style={styles.copies}>
        <Text style={styles.label}>Copies</Text>
        <Stepper label="copies" value={copies} min={1} max={MAX_COPIES} onChange={setCopies} />
      </View>

      <Text style={styles.section}>3 · Pickup or delivery</Text>
      <SegmentedTabs options={FULFILMENT} value={fulfilment} onChange={setFulfilment} />
      {fulfilment === 'delivery' ? (
        <InputField
          label="Delivery address"
          value={address}
          onChangeText={setAddress}
          multiline
          placeholder="Flat, street, area, landmark"
          style={styles.address}
          hint="Delivery fee is set by Ruxstar from the parcel weight."
        />
      ) : null}

      {quote ? (
        <View style={styles.summary}>
          <PriceSummary lines={quote.lines} />
        </View>
      ) : null}

      {checkout.failed ? (
        <ErrorBanner
          message="Your payment went through, but we could not create the order. Tap retry — you will not be charged again."
          onRetry={checkout.retry}
        />
      ) : null}

      <PaymentSheet
        visible={checkout.paying}
        onClose={checkout.closeSheet}
        lines={quote?.lines ?? []}
        purpose="pod-order"
        module="pod"
        onPaid={checkout.onPaid}
        onDone={finish}
        finishing={checkout.busy}
      />
    </ScreenContainer>
  );
}

export function PodOrderScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => PodService.shop(token, id));

  return data ? (
    <OrderForm shop={data} />
  ) : (
    <ScreenContainer title="Print shop">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={4}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  meta: { ...Typography.caption, color: Brand.textMuted },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.four },
  fileBox: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface },
  fileName: { ...Typography.bodyStrong, color: Brand.text },
  copies: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56 },
  label: { ...Typography.body, color: Brand.text },
  address: { height: 88, paddingTop: Spacing.three, textAlignVertical: 'top' },
  summary: { marginTop: Spacing.four, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface },
});
