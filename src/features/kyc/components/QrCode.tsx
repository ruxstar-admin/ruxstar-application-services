import { useMemo } from 'react';
import { create } from 'qrcode';
import Svg, { Path, Rect } from 'react-native-svg';

/** A QR code as SVG squares, with the four-module quiet zone scanners need. */
export function QrCode({ value, size = 96, label }: { value: string; size?: number; label: string }) {
  const { path, count } = useMemo(() => {
    const { modules } = create(value, { errorCorrectionLevel: 'M' });
    let d = '';
    for (let y = 0; y < modules.size; y++) {
      for (let x = 0; x < modules.size; x++) if (modules.get(x, y)) d += `M${x + 4} ${y + 4}h1v1h-1z`;
    }
    return { path: d, count: modules.size + 8 };
  }, [value]);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${count} ${count}`} accessibilityLabel={label} accessibilityRole="image">
      <Rect width={count} height={count} fill="#FFFFFF" />
      <Path d={path} fill="#0D0C12" />
    </Svg>
  );
}
