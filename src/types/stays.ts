export const FACILITIES = [
  { key: 'wifi', label: 'Wi-Fi' },
  { key: 'ac', label: 'AC' },
  { key: 'meals', label: 'Meals' },
  { key: 'laundry', label: 'Laundry' },
  { key: 'parking', label: 'Parking' },
  { key: 'power_backup', label: 'Power backup' },
] as const;

export type FacilityKey = (typeof FACILITIES)[number]['key'];

export interface Property {
  id: string;
  name: string;
  area: string;
  address: string;
  facilities: FacilityKey[];
  rating: number;
}

export interface Room {
  id: string;
  propertyId: string;
  name: string;
  /** Beds per room: 1 = single, 2 = double sharing, and so on. */
  sharing: number;
  /** Total beds the vendor offers in this room type. */
  beds: number;
  /** Rupees per bed per night. */
  ratePerNight: number;
}

export interface RoomAvailability {
  room: Room;
  /** Beds free for every night of the requested stay. */
  free: number;
}

export interface PropertyDetail {
  property: Property;
  rooms: RoomAvailability[];
}

export interface StayResult {
  property: Property;
  fromRate: number;
  freeBeds: number;
}

export interface StaySearch {
  q: string;
  facilities: FacilityKey[];
  from: string;
  to: string;
}

export interface Booking {
  id: string;
  propertyName: string;
  area: string;
  roomName: string;
  beds: number;
  from: string;
  to: string;
  nights: number;
  total: number;
  status: 'confirmed' | 'cancelled';
}

export interface NewProperty {
  name: string;
  area: string;
  address: string;
  facilities: FacilityKey[];
  room: { name: string; sharing: number; beds: number; ratePerNight: number };
}
