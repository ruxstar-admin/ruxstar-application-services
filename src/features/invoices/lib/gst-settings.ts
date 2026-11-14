import { money } from '@/features/vendor/lib/pod';
import type { GstLowRate, GstModulePatch, GstModuleSettings, GstSellerPatch, GstSellerSettings } from '@/types/invoice';
import { gstinError, stateOfGstin, STATE_NAMES } from './gstin';
import { percent } from './invoices';

/** The API's limits, in basis points. */
export const MAX_GST_BPS = 4000;
export const MAX_TCS_BPS = 200;

/** "18" -> 1800, "0.5" -> 50; NaN when it isn't a number. */
export const bpsOf = (text: string) => (/^\d+(\.\d{1,2})?$/.test(text.trim()) ? Math.round(Number(text) * 100) : NaN);
export const percentText = (bps: number) => String(bps / 100);
/** Digits and one dot, as typed into a percent field. */
export const decimalOnly = (text: string) => text.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');

export function rateError(bps: number, maxBps: number): string | undefined {
  return Number.isFinite(bps) && bps >= 0 && bps <= maxBps ? undefined : `Enter a rate from 0 to ${percent(maxBps)}, up to 2 decimals`;
}

/** HSN or SAC: 4 to 8 digits, or empty for none. */
export const codeError = (code: string) => (/^([0-9]{4,8})?$/.test(code) ? undefined : 'Use 4 to 8 digits, or leave it empty');

/** "5% up to ₹2,500 a piece" */
export const lowRateLine = (low: GstLowRate) => `${percent(low.rateBps)} up to ${money(low.upTo)} a piece`;

export interface ModuleValues {
  rate: string;
  code: string;
  codeKind: 'hsn' | 'sac';
  tcs: string;
}

export const moduleValues = (m: GstModuleSettings): ModuleValues => ({ rate: percentText(m.rateBps), code: m.code, codeKind: m.codeKind, tcs: percentText(m.tcsBps) });

export function moduleErrors(v: ModuleValues): Partial<Record<keyof ModuleValues, string>> {
  return { rate: rateError(bpsOf(v.rate), MAX_GST_BPS), code: codeError(v.code), tcs: rateError(bpsOf(v.tcs), MAX_TCS_BPS) };
}

/** Only what changed, so the defaults keep applying to the rest. */
export function modulePatch(m: GstModuleSettings, v: ModuleValues): GstModulePatch {
  const patch: GstModulePatch = {};
  if (bpsOf(v.rate) !== m.rateBps) patch.rateBps = bpsOf(v.rate);
  if (v.code !== m.code) patch.code = v.code;
  if (v.codeKind !== m.codeKind) patch.codeKind = v.codeKind;
  if (bpsOf(v.tcs) !== m.tcsBps) patch.tcsBps = bpsOf(v.tcs);
  return patch;
}

export interface SellerValues {
  legalName: string;
  tradeName: string;
  gstin: string;
  line: string;
  city: string;
  state: string;
  pincode: string;
  feeCode: string;
  feeRate: string;
}

export const sellerValues = (s: GstSellerSettings): SellerValues => ({
  legalName: s.legalName,
  tradeName: s.tradeName,
  gstin: s.gstin ?? '',
  line: s.address?.line ?? '',
  city: s.address?.city ?? '',
  state: s.address?.state ?? '',
  pincode: s.address?.pincode ?? '',
  feeCode: s.feeCode,
  feeRate: percentText(s.feeRateBps),
});

const between = (text: string, min: number, max: number, what: string) =>
  text.trim().length >= min && text.trim().length <= max ? undefined : `${what} needs ${min} to ${max} characters`;
const hasAddress = (v: SellerValues) => [v.line, v.city, v.state, v.pincode].some((x) => x.trim());

export function sellerErrors(v: SellerValues): Partial<Record<keyof SellerValues, string>> {
  const errors: Partial<Record<keyof SellerValues, string>> = {
    legalName: between(v.legalName, 2, 120, 'The legal name'),
    tradeName: between(v.tradeName, 2, 120, 'The trade name'),
    gstin: v.gstin ? gstinError(v.gstin) : undefined,
    feeCode: codeError(v.feeCode),
    feeRate: rateError(bpsOf(v.feeRate), MAX_GST_BPS),
  };
  if (hasAddress(v)) {
    errors.line = between(v.line, 3, 200, 'The address');
    errors.city = between(v.city, 2, 60, 'The city');
    errors.pincode = /^[1-9][0-9]{5}$/.test(v.pincode) ? undefined : 'A PIN code has 6 digits and does not start with 0';
    if (!STATE_NAMES.includes(v.state)) errors.state = 'Pick a state from the list';
    else if (v.gstin && !errors.gstin && stateOfGstin(v.gstin) !== v.state) errors.state = `The GSTIN is registered in ${stateOfGstin(v.gstin)}, so the address must be there too`;
  }
  return errors;
}

/** Only what changed. An empty GSTIN or address clears it. */
export function sellerPatch(s: GstSellerSettings, v: SellerValues): GstSellerPatch {
  const patch: GstSellerPatch = {};
  if (v.legalName.trim() !== s.legalName) patch.legalName = v.legalName.trim();
  if (v.tradeName.trim() !== s.tradeName) patch.tradeName = v.tradeName.trim();
  if ((v.gstin || null) !== s.gstin) patch.gstin = v.gstin || null;
  const address = hasAddress(v) ? { line: v.line.trim(), city: v.city.trim(), state: v.state, pincode: v.pincode } : null;
  const before = s.address;
  const same = address && before ? address.line === before.line && address.city === before.city && address.state === before.state && address.pincode === before.pincode : address === before;
  if (!same) patch.address = address;
  if (v.feeCode !== s.feeCode) patch.feeCode = v.feeCode;
  if (bpsOf(v.feeRate) !== s.feeRateBps) patch.feeRateBps = bpsOf(v.feeRate);
  return patch;
}
