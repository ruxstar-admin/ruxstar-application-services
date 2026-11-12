import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { InputField } from '@/components/ui/InputField';
import { SelectField } from '@/components/ui/SelectField';
import { Brand, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { digitsOnly } from '@/features/kyc/lib/validators';
import { DESCRIPTION_MAX, type ProfileErrors, type ProfileField, type ProfileValues } from '@/features/vendor/lib/business-form';
import { Feedback } from '@/lib/haptics';
import type { BusinessCatalog } from '@/types/business';

const OTHER_CITY = 'Other';
const LOCATE_TIMEOUT_MS = 10_000;

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

interface BusinessProfileFieldsProps {
  values: ProfileValues;
  errors: ProfileErrors;
  onChange: (patch: Partial<ProfileValues>) => void;
  states: BusinessCatalog['states'];
  namePlaceholder?: string;
  detailHint?: string;
}

/** Name, phone, the v1 location picker (current location, state, city, address lines) and the description. */
export function BusinessProfileFields({ values, errors, onChange, states, namePlaceholder, detailHint }: BusinessProfileFieldsProps) {
  const cities = useMemo(() => states.find((s) => s.name === values.state)?.cities ?? [], [states, values.state]);
  const listed = cities.some((c) => same(c, values.city));
  const [otherCity, setOtherCity] = useState(() => !!values.city && !listed);
  const [locating, setLocating] = useState(false);
  const [locateNote, setLocateNote] = useState<string | null>(null);

  const text = (field: ProfileField, clean: (t: string) => string = (t) => t) => (t: string) => onChange({ [field]: clean(t) });

  const locate = async () => {
    Feedback.select();
    setLocating(true);
    setLocateNote(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return setLocateNote('Location is off for Ruxstar. Allow it in Settings, or fill the address in.');
      const fix = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), LOCATE_TIMEOUT_MS)),
      ]);
      const point = { lat: fix.coords.latitude, lng: fix.coords.longitude };
      const [place] = await Location.reverseGeocodeAsync({ latitude: point.lat, longitude: point.lng });
      const state = states.find((s) => place?.region && same(s.name, place.region));
      if (!place || !state) {
        onChange({ point });
        return setLocateNote('We saved the map point but could not read the state. Choose it below.');
      }
      const placeCity = place.city ?? place.subregion ?? place.district ?? '';
      const city = state.cities.find((c) => same(c, placeCity)) ?? placeCity;
      setOtherCity(!state.cities.some((c) => same(c, city)));
      onChange({
        point,
        state: state.name,
        city,
        street: place.street ?? values.street,
        area: place.district && !same(place.district, city) ? place.district : values.area,
        pincode: place.postalCode && /^[1-9][0-9]{5}$/.test(place.postalCode) ? place.postalCode : values.pincode,
      });
      Feedback.success();
      setLocateNote('Filled from your location. Check it and add the door number and building.');
    } catch {
      setLocateNote('Could not get your location. Fill the address in instead.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <>
      <InputField
        label="Business name"
        value={values.name}
        onChangeText={text('name')}
        error={errors.name}
        placeholder={namePlaceholder}
        autoCapitalize="words"
        autoComplete="organization"
        maxLength={80}
      />
      <InputField
        label="Business phone"
        value={values.phone}
        onChangeText={text('phone', (t) => digitsOnly(t, 10))}
        error={errors.phone}
        hint="Customers call this number."
        keyboardType="phone-pad"
        autoComplete="tel"
        maxLength={10}
      />

      <Text style={styles.section}>Location</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Use current location"
        accessibilityState={{ busy: locating }}
        disabled={locating}
        onPress={locate}
        style={({ pressed }) => [styles.locate, pressed && styles.pressed]}
      >
        {locating ? <ActivityIndicator size="small" color={Brand.text} /> : <Ionicons name="locate-outline" size={18} color={Brand.text} />}
        <Text style={styles.locateText}>{locating ? 'Finding your location…' : values.point ? 'Update from current location' : 'Use current location'}</Text>
      </Pressable>
      {locateNote ? <Text style={styles.note}>{locateNote}</Text> : null}

      <SelectField
        label="State"
        value={values.state}
        options={states.map((s) => s.name)}
        onChange={(state) => {
          if (state === values.state) return;
          setOtherCity(false);
          onChange({ state, city: '' });
        }}
        placeholder="Choose the state"
        error={errors.state}
      />
      <SelectField
        label="City"
        value={otherCity ? OTHER_CITY : values.city}
        options={[...cities, OTHER_CITY]}
        onChange={(city) => {
          const other = city === OTHER_CITY;
          setOtherCity(other);
          onChange({ city: other ? '' : city });
        }}
        placeholder={values.state ? 'Choose the city' : 'Choose the state first'}
        disabled={!values.state}
        error={otherCity ? undefined : errors.city}
      />
      {otherCity ? (
        <InputField
          label="City name"
          value={values.city}
          onChangeText={text('city')}
          error={errors.city}
          autoCapitalize="words"
          autoComplete="postal-address-locality"
          maxLength={60}
        />
      ) : null}
      <View style={styles.row}>
        <View style={styles.narrow}>
          <InputField label="Door no." value={values.doorNo} onChangeText={text('doorNo')} error={errors.doorNo} maxLength={60} />
        </View>
        <View style={styles.flex}>
          <InputField label="Building" value={values.building} onChangeText={text('building')} error={errors.building} maxLength={120} autoCapitalize="words" />
        </View>
      </View>
      <InputField label="Street" value={values.street} onChangeText={text('street')} error={errors.street} maxLength={120} autoCapitalize="words" />
      <View style={styles.row}>
        <View style={styles.flex}>
          <InputField label="Area" value={values.area} onChangeText={text('area')} error={errors.area} maxLength={120} autoCapitalize="words" />
        </View>
        <View style={styles.narrow}>
          <InputField
            label="PIN code"
            value={values.pincode}
            onChangeText={text('pincode', (t) => digitsOnly(t, 6))}
            error={errors.pincode}
            keyboardType="number-pad"
            autoComplete="postal-code"
            maxLength={6}
          />
        </View>
      </View>

      <InputField
        label="About (optional)"
        value={values.description}
        onChangeText={text('description')}
        error={errors.description}
        placeholder={detailHint ?? 'What you offer, in a few lines'}
        multiline
        maxLength={DESCRIPTION_MAX}
        showCount
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.three },
  locate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  pressed: { opacity: 0.8 },
  locateText: { fontFamily: Fonts.semibold, fontSize: 15, color: Brand.text },
  note: { ...Typography.caption, color: Brand.textMuted },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  narrow: { width: 120 },
});
