export interface StayRange {
  from: string;
  to: string;
}

export interface BookedBeds extends StayRange {
  beds: number;
}

/** Nights `[from, to)` as day keys; a stay occupies its nights, so the check-out day is free for the next guest. */
export const nightKeys = (range: StayRange): string[] => {
  const keys: string[] = [];
  const cursor = new Date(`${range.from}T00:00:00`);
  const end = new Date(`${range.to}T00:00:00`);
  while (cursor < end) {
    keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
};

/** Beds free on every night of `range`: the minimum across nights, so one full night blocks the stay. */
export const freeBeds = (totalBeds: number, bookings: BookedBeds[], range: StayRange): number => {
  const nights = nightKeys(range);
  if (nights.length === 0) return 0;
  const worstBooked = Math.max(
    ...nights.map((night) =>
      bookings.filter((b) => b.from <= night && night < b.to).reduce((sum, b) => sum + b.beds, 0),
    ),
  );
  return Math.max(0, totalBeds - worstBooked);
};

export const stayTotal = (ratePerNight: number, beds: number, nights: number) => ratePerNight * beds * nights;
