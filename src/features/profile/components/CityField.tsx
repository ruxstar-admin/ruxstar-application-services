import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { InputField } from '@/components/ui/InputField';
import { Brand, Fonts, Radius } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { ProfileService } from '@/services/profile-service';

const LOCATE_TIMEOUT_MS = 10_000;
/** A fix from the last 10 minutes is close enough for a city. */
const RECENT_FIX_MS = 10 * 60_000;

class Blocked extends Error {}

async function position(): Promise<Location.LocationObjectCoords> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Blocked();
  const recent = await Location.getLastKnownPositionAsync({ maxAge: RECENT_FIX_MS });
  if (recent) return recent.coords;
  const fresh = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), LOCATE_TIMEOUT_MS)),
  ]);
  return fresh.coords;
}

interface CityFieldProps {
  value: string;
  onChange: (city: string) => void;
  autoFocus?: boolean;
}

/** Typed, or filled from the phone's location through the API (which names the map source). */
export function CityField({ value, onChange, autoFocus }: CityFieldProps) {
  const token = useAuthToken();
  const [locating, setLocating] = useState(false);
  const [found, setFound] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const locate = async () => {
    Feedback.select();
    setLocating(true);
    setProblem(null);
    try {
      const { latitude, longitude } = await position();
      const result = await ProfileService.cityAt(token, latitude, longitude);
      if (!result.city) {
        setProblem('We could not name a city there. Type it instead.');
        return;
      }
      onChange(result.city);
      setFound(result.attribution);
    } catch (err) {
      if (err instanceof Blocked) setProblem('Location is off for Ruxstar. Allow it in Settings, or type your city.');
      else if (err instanceof ApiError) setProblem(err.message);
      else setProblem('Could not get your location. Type your city instead.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <InputField
      label="City"
      value={value}
      onChangeText={(text) => {
        onChange(text);
        setFound(null);
        setProblem(null);
      }}
      autoFocus={autoFocus}
      autoCapitalize="words"
      autoComplete="postal-address-locality"
      textContentType="addressCity"
      maxLength={60}
      hint={problem ?? (found ? `Found from your location. Map data ${found}.` : 'Where you usually book and order.')}
      accessory={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Use my location"
          accessibilityState={{ busy: locating }}
          disabled={locating}
          hitSlop={8}
          onPress={locate}
          style={({ pressed }) => [styles.locate, pressed && styles.pressed]}
        >
          {locating ? (
            <ActivityIndicator size="small" color={Brand.textMuted} />
          ) : (
            <Ionicons name="locate-outline" size={16} color={Brand.text} />
          )}
          <Text style={styles.locateText}>{locating ? 'Finding…' : 'Locate'}</Text>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  locate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    backgroundColor: Brand.surfaceAlt,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
  locateText: { fontFamily: Fonts.semibold, fontSize: 13, color: Brand.text },
});
