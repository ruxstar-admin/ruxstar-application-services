import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';
import type { GeoPoint, OrderAddress } from '@/types/order';

const LOCATE_TIMEOUT_MS = 10_000;

interface DropLocationProps {
  point: GeoPoint | null;
  /** The point, and the address parts the phone could read, to fill in only where empty. */
  onLocated: (point: GeoPoint, found: Partial<Pick<OrderAddress, 'line' | 'city' | 'pincode'>>) => void;
  onClear: () => void;
}

/** "Use my location" at checkout: the exact door for delivery by distance and for the rider's map. */
export function DropLocation({ point, onLocated, onClear }: DropLocationProps) {
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const locate = async () => {
    Feedback.select();
    setLocating(true);
    setNote(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return setNote('Location is off for Ruxstar. Allow it in Settings, or type the address in.');
      const fix = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), LOCATE_TIMEOUT_MS)),
      ]);
      const at = { lat: fix.coords.latitude, lng: fix.coords.longitude };
      const [place] = await Location.reverseGeocodeAsync({ latitude: at.lat, longitude: at.lng }).catch(() => []);
      const line = [place?.name, place?.street, place?.district].filter((part, i, all) => part && all.indexOf(part) === i).join(', ');
      onLocated(at, {
        ...(line ? { line } : {}),
        ...(place?.city ? { city: place.city } : {}),
        ...(place?.postalCode && /^[1-9]\d{5}$/.test(place.postalCode) ? { pincode: place.postalCode } : {}),
      });
      Feedback.success();
    } catch {
      setNote('Could not get your location. Type the address in instead.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={styles.container}>
      {point ? (
        <View style={styles.row}>
          <Ionicons name="location" size={20} color={Brand.success} />
          <Text style={styles.text}>Your location is added. Add the door number and building above.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Remove your location" hitSlop={10} onPress={onClear}>
            <Ionicons name="close" size={20} color={Brand.textMuted} />
          </Pressable>
        </View>
      ) : (
        <Pressable accessibilityRole="button" onPress={locate} disabled={locating} style={({ pressed }) => [styles.row, styles.button, pressed && styles.pressed]}>
          {locating ? <ActivityIndicator color={Brand.primarySoft} /> : <Ionicons name="locate-outline" size={20} color={Brand.primarySoft} />}
          <Text style={styles.action}>{locating ? 'Finding you…' : 'Use my location'}</Text>
        </Pressable>
      )}
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  button: { paddingHorizontal: Spacing.three, borderRadius: Radius.pill, borderWidth: 1, borderColor: Brand.border, alignSelf: 'flex-start' },
  pressed: { opacity: 0.7 },
  action: { ...Typography.bodyStrong, fontSize: 14, color: Brand.text },
  text: { ...Typography.caption, fontSize: 13, color: Brand.textMuted, flex: 1 },
  note: { ...Typography.caption, fontSize: 12, color: Brand.warning },
});
