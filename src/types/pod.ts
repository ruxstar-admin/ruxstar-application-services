import type { PriceLine } from './commerce';

export type PaperSize = 'A4' | 'A3' | 'Letter';
export type Fulfilment = 'pickup' | 'delivery';

export interface PrintShop {
  id: string;
  name: string;
  area: string;
  rating: number;
  /** Typical time from payment to ready, e.g. "Under 1 hour". */
  turnaround: string;
  /** Per-page rates in rupees for A4; A3 costs double. */
  bwRate: number;
  colorRate: number;
}

export interface PrintSpecs {
  paper: PaperSize;
  color: boolean;
  doubleSided: boolean;
  copies: number;
  pages: number;
}

export interface PodQuote {
  lines: PriceLine[];
  total: number;
  weightGrams: number;
}

export type PodStatus = 'placed' | 'accepted' | 'printing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';

export interface PodOrder {
  id: string;
  shopId: string;
  shopName: string;
  fileName: string;
  specs: PrintSpecs;
  fulfilment: Fulfilment;
  address?: string;
  /** 4-digit code the customer gives the rider on arrival (delivery orders only). */
  deliveryCode?: string;
  status: PodStatus;
  lines: PriceLine[];
  total: number;
  createdAt: string;
  timeline: { status: PodStatus; at: string }[];
}

export interface UploadedFile {
  fileId: string;
  /** Pages detected in the document. */
  pages: number;
}
