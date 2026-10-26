/** offered → accepted (heading to the shop) → picked_up (heading to the customer) → delivered. */
export type JobStatus = 'offered' | 'accepted' | 'picked_up' | 'delivered';

export interface DeliveryJob {
  id: string;
  /** The order this delivery belongs to (e.g. a print order id). */
  orderRef: string;
  shopName: string;
  pickupArea: string;
  dropArea: string;
  /** Paid to the partner from the delivery fee. Rupees. */
  fee: number;
  distanceKm: number;
  status: JobStatus;
  createdAt: string;
  deliveredAt?: string;
}

export interface PartnerStats {
  online: boolean;
  earnedToday: number;
  dropsToday: number;
  onlineMinutes: number;
}

export interface PartnerHome {
  stats: PartnerStats;
  /** The job being carried out right now, if any. */
  active?: DeliveryJob;
  /** Offers waiting to be accepted. */
  waiting: DeliveryJob[];
  recent: DeliveryJob[];
}

export interface PartnerEarnings {
  today: number;
  week: number;
  total: number;
  items: DeliveryJob[];
}
