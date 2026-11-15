import { money } from '@/features/vendor/lib/pod';
import type { ModuleName, ModuleSettings } from '@/types/admin';
import type { GstModule } from '@/types/invoice';
import type { Icon } from '../components/tiles';
import { GST_MODULE_LABEL, MODULE_LABEL } from '../labels';

export const MODULE_ICON: Record<ModuleName, Icon> = {
  pod: 'print-outline',
  events: 'ticket-outline',
  coaching: 'school-outline',
  stays: 'bed-outline',
  turf: 'football-outline',
  shop: 'storefront-outline',
  delivery: 'bicycle-outline',
  ledger: 'wallet-outline',
};

const has = (map: object, key: unknown): boolean => typeof key === 'string' && Object.prototype.hasOwnProperty.call(map, key);

export const isModuleName = (key: unknown): key is ModuleName => has(MODULE_LABEL, key);
export const isGstModule = (key: unknown): key is GstModule => has(GST_MODULE_LABEL, key);

/** One line under a module's name in the list: what it charges, and anything switched off. */
export function moduleSummary(m: ModuleSettings): string {
  if (m.delivery) return `Partners get ${money(m.delivery.riderRate.base)} a trip · offers wait ${m.delivery.offerMinutes} min`;
  if (m.payouts) return `${m.payouts.fee ? `${money(m.payouts.fee)} withdrawal fee` : 'No withdrawal fee'} · least ${money(m.payouts.minimum)}`;
  return [`${m.commissionBps / 100}% commission`, m.platformFee ? `${money(m.platformFee)} fee` : 'no fee', m.signupsOpen ? null : 'new vendors closed']
    .filter(Boolean)
    .join(' · ');
}
