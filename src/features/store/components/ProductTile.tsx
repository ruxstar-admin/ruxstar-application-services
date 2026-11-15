import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';
import type { ProductCard } from '@/types/store';
import { priceSpoken } from '../lib/store';
import { PriceTag } from './PriceTag';

/** A product in a shop's grid: a square photo, the title, price with the MRP struck, and Sold out. */
export function ProductTile({ product, width, onPress }: { product: ProductCard; width: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[product.title, priceSpoken(product.priceFrom, product.mrpFrom), product.inStock ? null : 'Sold out'].filter(Boolean).join(', ')}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}
    >
      <View style={[styles.photo, { height: width }]}>
        {product.photo ? (
          <Image source={{ uri: product.photo.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} recyclingKey={product.photo.url} />
        ) : (
          <Ionicons name="bag-handle-outline" size={36} color={Brand.textFaint} />
        )}
        {!product.inStock ? (
          <View style={styles.soldOut}>
            <Text style={styles.soldOutText}>Sold out</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>
        <PriceTag price={product.priceFrom} mrp={product.mrpFrom} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, overflow: 'hidden' },
  pressed: { opacity: 0.85 },
  photo: { width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.surfaceAlt },
  soldOut: { position: 'absolute', left: Spacing.two, bottom: Spacing.two, paddingHorizontal: Spacing.two, paddingVertical: 3, borderRadius: Radius.pill, backgroundColor: Brand.bg },
  soldOutText: { ...Typography.caption, fontSize: 12, color: Brand.text },
  body: { padding: Spacing.two, gap: 4 },
  title: { ...Typography.body, fontSize: 14, lineHeight: 19, color: Brand.text, minHeight: 38 },
});
