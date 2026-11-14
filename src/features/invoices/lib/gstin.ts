/** GST state codes, by the state names the API uses. */
export const GST_STATES: Readonly<Record<string, string>> = {
  'Jammu and Kashmir': '01',
  'Himachal Pradesh': '02',
  Punjab: '03',
  Chandigarh: '04',
  Uttarakhand: '05',
  Haryana: '06',
  Delhi: '07',
  Rajasthan: '08',
  'Uttar Pradesh': '09',
  Bihar: '10',
  Sikkim: '11',
  'Arunachal Pradesh': '12',
  Nagaland: '13',
  Manipur: '14',
  Mizoram: '15',
  Tripura: '16',
  Meghalaya: '17',
  Assam: '18',
  'West Bengal': '19',
  Jharkhand: '20',
  Odisha: '21',
  Chhattisgarh: '22',
  'Madhya Pradesh': '23',
  Gujarat: '24',
  'Dadra and Nagar Haveli and Daman and Diu': '26',
  Maharashtra: '27',
  Karnataka: '29',
  Goa: '30',
  Lakshadweep: '31',
  Kerala: '32',
  'Tamil Nadu': '33',
  Puducherry: '34',
  'Andaman and Nicobar Islands': '35',
  Telangana: '36',
  'Andhra Pradesh': '37',
  Ladakh: '38',
};

export const STATE_NAMES = Object.keys(GST_STATES).sort((a, b) => a.localeCompare(b));

const SHAPE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Upper case, letters and digits only, at most 15. */
export const cleanGstin = (text: string) => text.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15);

export const stateOfGstin = (gstin: string | null | undefined) =>
  gstin ? (Object.keys(GST_STATES).find((s) => GST_STATES[s] === gstin.slice(0, 2)) ?? null) : null;

/** The 15th character: a base-36 check over the first 14, so a typo shows up before saving. */
export function gstinCheckChar(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const product = CHARS.indexOf(first14[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return CHARS[(36 - (sum % 36)) % 36];
}

/** Why a GSTIN can't be right, or undefined when it looks right. */
export function gstinError(gstin: string): string | undefined {
  if (gstin.length !== 15) return 'A GSTIN has 15 characters: 2 digits, the 10-character PAN, then 3 more.';
  if (!SHAPE.test(gstin)) return "That isn't a GSTIN's shape: 2 digits, the 10-character PAN, a number or letter, Z, then one more.";
  if (!stateOfGstin(gstin)) return 'The first two digits should be a state code, like 36 for Telangana.';
  if (gstinCheckChar(gstin.slice(0, 14)) !== gstin[14]) return "The last character doesn't match the rest. Check for a typo.";
  return undefined;
}
