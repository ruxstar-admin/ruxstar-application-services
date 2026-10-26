import { apiPost } from '@/lib/api-client';
import type { Booking, FacilityKey, NewProperty, Property, PropertyDetail, Room, StayResult, StaySearch } from '@/types/stays';

/** PG / hostel stays: search, book, and vendor property tools. Not in the backend yet — mocked (stays.mocks.ts). */
export const StaysService = {
  search: (token: string, query: StaySearch) => apiPost<StayResult[]>('/stays/search', { ...query }, token),
  property: (token: string, id: string, from?: string, to?: string) => apiPost<PropertyDetail>('/stays/get', { id, from, to }, token),
  book: (token: string, booking: { roomId: string; from: string; to: string; beds: number; paymentRef: string }) =>
    apiPost<Booking>('/stays/book', booking, token),
  booking: (token: string, id: string) => apiPost<Booking>('/stays/booking', { id }, token),

  vendorProperties: (token: string) => apiPost<Property[]>('/stays/vendor/properties', undefined, token),
  create: (token: string, property: NewProperty) => apiPost<Property>('/stays/vendor/create', { ...property }, token),
  saveRoom: (token: string, propertyId: string, room: Omit<Room, 'id' | 'propertyId'> & { id?: string }) =>
    apiPost<Room>('/stays/vendor/room/save', { propertyId, room }, token),
  setFacilities: (token: string, propertyId: string, facilities: FacilityKey[]) =>
    apiPost<Property>('/stays/vendor/facilities', { propertyId, facilities }, token),
};
