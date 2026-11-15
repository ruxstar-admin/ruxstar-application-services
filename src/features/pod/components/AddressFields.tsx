import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { InputField } from '@/components/ui/InputField';
import { Spacing } from '@/constants/theme';
import { DropLocation } from '@/features/pod/components/DropLocation';
import { OrderService } from '@/services/order-service';
import { ProfileService } from '@/services/profile-service';
import type { OrderAddress } from '@/types/order';

const digits = (text: string, max: number) => text.replace(/\D/g, '').slice(0, max);

export type AddressErrors = Partial<Record<keyof OrderAddress, string>>;

/** What's missing from a delivery address, field by field. */
export function addressErrors(address: OrderAddress): AddressErrors {
  return {
    ...(address.name.trim().length < 2 ? { name: 'Enter the name to deliver to' } : {}),
    ...(!/^[6-9]\d{9}$/.test(address.phone) ? { phone: 'Enter a 10-digit mobile number' } : {}),
    ...(address.line.trim().length < 5 ? { line: 'Enter the house, street and area' } : {}),
    ...(address.city.trim().length < 2 ? { city: 'Enter the city' } : {}),
    ...(!/^[1-9]\d{5}$/.test(address.pincode) ? { pincode: 'Enter the 6-digit pincode' } : {}),
  };
}

/** The address with its text fields trimmed, as the API takes it. */
export const cleanAddress = (a: OrderAddress): OrderAddress => ({ ...a, name: a.name.trim(), line: a.line.trim(), city: a.city.trim() });

/**
 * The delivery address, filled in from `earlier` (such as the last order of this kind), then the last print order, then the
 * account's name, phone and city. Pass a function that doesn't change between renders.
 */
export function usePrefilledAddress(token: string, city: string, earlier?: (token: string) => Promise<OrderAddress | null>) {
  const [address, setAddress] = useState<OrderAddress>({ name: '', phone: '', line: '', city, pincode: '' });
  useEffect(() => {
    let live = true;
    Promise.all([
      earlier ? earlier(token).catch(() => null) : Promise.resolve(null),
      OrderService.list(token).catch(() => null),
      ProfileService.account(token).catch(() => null),
    ]).then(([mine, orders, me]) => {
      if (!live) return;
      const last = mine ?? orders?.items[0]?.address;
      setAddress((now) =>
        now.name || now.phone || now.line
          ? now
          : (last ?? { name: me?.name ?? '', phone: (me?.phone ?? '').replace(/\D/g, '').slice(-10), line: '', city: me?.city || city, pincode: '' }),
      );
    });
    return () => {
      live = false;
    };
  }, [token, city, earlier]);
  return [address, setAddress] as const;
}

interface AddressFieldsProps {
  address: OrderAddress;
  onChange: (update: (now: OrderAddress) => OrderAddress) => void;
  /** Already filtered to the ones to show. */
  errors: AddressErrors;
  /** Shown under City whatever `errors` says, such as the cities a shop delivers to. */
  cityError?: string;
}

/** Name, phone, house and street, "Use my location", city and pincode, for delivering an order. */
export function AddressFields({ address, onChange, errors, cityError }: AddressFieldsProps) {
  const set = (field: keyof OrderAddress) => (text: string) =>
    onChange((now) => ({ ...now, [field]: field === 'phone' ? digits(text, 10) : field === 'pincode' ? digits(text, 6) : text }));
  return (
    <>
      <InputField label="Name" value={address.name} onChangeText={set('name')} maxLength={80} autoComplete="name" error={errors.name} />
      <InputField label="Phone" value={address.phone} onChangeText={set('phone')} keyboardType="phone-pad" maxLength={10} autoComplete="tel" error={errors.phone} />
      <InputField label="House, street and area" value={address.line} onChangeText={set('line')} maxLength={300} multiline error={errors.line} />
      <DropLocation
        point={address.point ?? null}
        onLocated={(point, found) =>
          onChange((now) => ({
            ...now,
            point,
            line: now.line.trim() ? now.line : (found.line ?? now.line),
            city: found.city && !now.city.trim() ? found.city : now.city,
            pincode: now.pincode || found.pincode || '',
          }))
        }
        onClear={() => onChange((now) => ({ ...now, point: null }))}
      />
      <View style={styles.pair}>
        <View style={styles.flex}>
          <InputField label="City" value={address.city} onChangeText={set('city')} maxLength={60} error={cityError ?? errors.city} />
        </View>
        <View style={styles.pin}>
          <InputField label="Pincode" value={address.pincode} onChangeText={set('pincode')} keyboardType="number-pad" maxLength={6} error={errors.pincode} />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pair: { flexDirection: 'row', gap: Spacing.two },
  pin: { width: 130 },
});
