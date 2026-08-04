import { Brand, DarkBrand } from '@/constants/theme';
import { useThemeStore } from '@/stores/theme-store';

export type BrandTokens = { [K in keyof typeof DarkBrand]: string };

export function useTheme(): { brand: BrandTokens; isDark: boolean } {
  const mode = useThemeStore((s) => s.mode);
  return {
    brand: (mode === 'dark' ? DarkBrand : Brand) as BrandTokens,
    isDark: mode === 'dark',
  };
}
