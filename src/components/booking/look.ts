import type { Ionicons } from '@expo/vector-icons';
import { Brand } from '@/constants/theme';
import type { BoardState } from '@/lib/booking/board';

type Icon = keyof typeof Ionicons.glyphMap;

export interface CellLook {
  label: string;
  icon: Icon;
  bg: string;
  border: string;
  text: string;
  iconColor: string;
  dashed?: boolean;
}

/** How every slot, board cell and legend swatch looks. Each state has its own icon, so colour is never the only signal. */
export const CELL_LOOK: Record<BoardState, CellLook> = {
  free: { label: 'Free', icon: 'ellipse-outline', bg: Brand.surface, border: Brand.border, text: Brand.text, iconColor: Brand.textMuted },
  few: { label: 'Few left', icon: 'alert-circle-outline', bg: Brand.surface, border: Brand.warning, text: Brand.text, iconColor: Brand.warning },
  peak: { label: 'Peak', icon: 'flame-outline', bg: Brand.surface, border: Brand.secondary, text: Brand.text, iconColor: Brand.secondary },
  selected: { label: 'Selected', icon: 'checkmark-circle', bg: Brand.primaryDeep, border: Brand.primary, text: Brand.text, iconColor: Brand.text },
  booked: { label: 'Booked', icon: 'close-circle', bg: Brand.surfaceAlt, border: Brand.surfaceAlt, text: Brand.textMuted, iconColor: Brand.textMuted },
  held: { label: 'Held', icon: 'time-outline', bg: Brand.surfaceAlt, border: Brand.warning, text: Brand.textMuted, iconColor: Brand.warning, dashed: true },
  blocked: { label: 'Blocked', icon: 'lock-closed', bg: Brand.bg, border: Brand.textFaint, text: Brand.textFaint, iconColor: Brand.textFaint, dashed: true },
};
