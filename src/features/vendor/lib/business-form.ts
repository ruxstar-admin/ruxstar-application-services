import type { Business, LocationInput } from '@/types/business';

export const PHONE = /^[6-9][0-9]{9}$/;
export const PINCODE = /^[1-9][0-9]{5}$/;
export const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const DESCRIPTION_MAX = 500;

/** The profile the create and details screens share; text as typed. */
export interface ProfileValues {
  name: string;
  phone: string;
  description: string;
  state: string;
  city: string;
  doorNo: string;
  building: string;
  street: string;
  area: string;
  pincode: string;
  point: { lat: number; lng: number } | null;
}

export type ProfileField = Exclude<keyof ProfileValues, 'point'>;
export type ProfileErrors = Partial<Record<ProfileField, string>>;

export const EMPTY_PROFILE: ProfileValues = {
  name: '',
  phone: '',
  description: '',
  state: '',
  city: '',
  doorNo: '',
  building: '',
  street: '',
  area: '',
  pincode: '',
  point: null,
};

export const profileOf = (b: Business): ProfileValues => ({
  name: b.name,
  phone: b.phone ?? '',
  description: b.description ?? '',
  state: b.location?.state ?? '',
  city: b.location?.city ?? '',
  doorNo: b.location?.doorNo ?? '',
  building: b.location?.building ?? '',
  street: b.location?.street ?? '',
  area: b.location?.area ?? '',
  pincode: b.location?.pincode ?? '',
  point: b.location?.point ?? null,
});

export function checkProfile(v: ProfileValues): ProfileErrors {
  const e: ProfileErrors = {};
  if (v.name.trim().length < 2) e.name = 'Enter the business name.';
  if (!PHONE.test(v.phone)) e.phone = 'Enter a 10-digit mobile number customers can call.';
  if (!v.state) e.state = 'Choose the state.';
  if (v.city.trim().length < 2) e.city = 'Choose or type the city.';
  if (v.pincode && !PINCODE.test(v.pincode)) e.pincode = 'Enter the 6-digit PIN code, or leave it empty.';
  return e;
}

const orNull = (text: string) => text.trim() || null;

export const locationOf = (v: ProfileValues): LocationInput => ({
  state: v.state,
  city: v.city.trim(),
  doorNo: orNull(v.doorNo),
  building: orNull(v.building),
  street: orNull(v.street),
  area: orNull(v.area),
  pincode: orNull(v.pincode),
  point: v.point,
});

/** API field paths such as `body/location/state` to the form field they belong to. */
export function profileFieldOf(path: string): ProfileField | undefined {
  const last = path.split('/').pop() ?? '';
  return (Object.keys(EMPTY_PROFILE) as (keyof ProfileValues)[]).find((k): k is ProfileField => k === last && k !== 'point');
}
