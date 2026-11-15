import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { errorText } from '@/features/events/lib/messages';
import { money } from '@/features/vendor/lib/pod';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { StoreDeskService } from '@/services/store-service';
import type { VendorProduct } from '@/types/store';
import { PRODUCT_STATUS } from '../lib/store';
import { stockChanges } from '../lib/variants';

const LOW = 3;

interface StockRowProps {
  product: VendorProduct;
  /** Opens the product form; left out for someone who can only count stock. */
  onOpen?: () => void;
  onSaved: (product: VendorProduct) => void;
}

/** A product at the desk: photo, price, status, how many are left, and a quick stock edit for each variant. */
export function StockRow({ product, onOpen, onSaved }: StockRowProps) {
  const token = useAuthToken();
  const [editing, setEditing] = useState(false);
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const total = product.variants.reduce((s, v) => s + v.stock, 0);
  const low = product.variants.filter((v) => v.stock <= LOW).length;
  const status = PRODUCT_STATUS[product.status];
  const { changes, valid } = stockChanges(product.variants, typed);

  const start = () => {
    Feedback.tap();
    setTyped(Object.fromEntries(product.variants.map((v) => [v.id, String(v.stock)])));
    setFailure(null);
    setEditing(true);
  };
  const save = async () => {
    if (!changes.length) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setFailure(null);
    try {
      const next = await StoreDeskService.stock(token, product.id, changes);
      Feedback.success();
      onSaved(next);
      setEditing(false);
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole={onOpen ? 'button' : undefined}
        accessibilityLabel={`${product.title}, ${status.label}, ${total} left`}
        disabled={!onOpen}
        onPress={() => {
          Feedback.tap();
          onOpen?.();
        }}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={styles.thumb}>
          {product.photo ? (
            <Image source={{ uri: product.photo.url }} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={product.photo.url} accessible={false} />
          ) : (
            <Ionicons name="image-outline" size={22} color={Brand.textFaint} />
          )}
        </View>
        <View style={styles.flex}>
          <Text style={styles.title} numberOfLines={2}>
            {product.title}
          </Text>
          <Text style={styles.small}>{`${product.variants.length > 1 ? 'From ' : ''}${money(product.priceFrom)} · ${total} left${product.variants.length > 1 ? ` in ${product.variants.length} options` : ''}`}</Text>
          {low ? <Text style={styles.warn}>{product.variants.length > 1 ? `${low} option${low === 1 ? '' : 's'} at ${LOW} or fewer` : total ? 'Running low' : 'Sold out'}</Text> : null}
        </View>
        <Badge label={status.label} tone={status.tone} />
      </Pressable>

      {editing ? (
        <View style={styles.editor}>
          {product.variants.map((v) => (
            <View key={v.id} style={styles.variant}>
              <Text style={styles.variantName} numberOfLines={1}>
                {v.values.length ? v.values.join(' / ') : 'In stock'}
              </Text>
              <TextInput
                value={typed[v.id] ?? ''}
                onChangeText={(t) => setTyped((now) => ({ ...now, [v.id]: t.replace(/\D/g, '').slice(0, 6) }))}
                keyboardType="number-pad"
                accessibilityLabel={`Stock for ${v.values.join(' ') || product.title}`}
                style={styles.input}
                selectTextOnFocus
              />
            </View>
          ))}
          {failure ? <ErrorBanner message={failure} /> : null}
          <PrimaryButton label={changes.length ? `Save ${changes.length} change${changes.length === 1 ? '' : 's'}` : 'Done'} onPress={save} loading={saving} disabled={!valid} />
          <TextLink label="Cancel" muted onPress={() => setEditing(false)} />
        </View>
      ) : product.status !== 'removed' ? (
        <TextLink label="Update stock" onPress={start} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two, padding: Spacing.three, marginBottom: Spacing.two, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  pressed: { opacity: 0.7 },
  thumb: { width: 56, height: 56, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: Brand.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
  title: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
  warn: { ...Typography.caption, color: Brand.warning },
  editor: { gap: Spacing.two },
  variant: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 48 },
  variantName: { ...Typography.body, color: Brand.text, flex: 1 },
  input: {
    width: 96,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.bg,
    color: Brand.text,
    textAlign: 'center',
    ...Typography.bodyStrong,
  },
});
