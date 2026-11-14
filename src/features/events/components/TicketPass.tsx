import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { create } from 'qrcode';
import Svg, { Path, Rect } from 'react-native-svg';
import { Badge } from '@/components/ui/Badge';
import { Brand, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';
import type { TicketView } from '@/types/events';
import { TICKET_STATUS, dayText, timeText } from '../lib/events';

type SvgHandle = { toDataURL: (done: (base64: string) => void, options?: { width?: number; height?: number }) => void };

function QrSvg({ value, size, svgRef }: { value: string; size: number; svgRef: React.Ref<SvgHandle> }) {
  const { path, count } = useMemo(() => {
    const { modules } = create(value, { errorCorrectionLevel: 'M' });
    let d = '';
    for (let y = 0; y < modules.size; y++) {
      for (let x = 0; x < modules.size; x++) if (modules.get(x, y)) d += `M${x + 4} ${y + 4}h1v1h-1z`;
    }
    return { path: d, count: modules.size + 8 };
  }, [value]);
  return (
    <Svg ref={svgRef as never} width={size} height={size} viewBox={`0 0 ${count} ${count}`} accessibilityLabel="Ticket QR code" accessibilityRole="image">
      <Rect width={count} height={count} fill="#FFFFFF" />
      <Path d={path} fill="#0D0C12" />
    </Svg>
  );
}

const bytesOf = (base64: string) => {
  const text = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(text.length));
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
  return bytes;
};

/**
 * One person's ticket: their QR code and six letters, big enough to scan off a phone at the gate. Share sends the
 * QR as a picture, so whoever it's for can show it from their own phone.
 */
export function TicketPass({ ticket, title, startsAt, index, total }: { ticket: TicketView; title: string; startsAt: string; index: number; total: number }) {
  const svg = useRef<SvgHandle>(null);
  const [sharing, setSharing] = useState(false);
  const status = TICKET_STATUS[ticket.status];

  const share = () => {
    if (!ticket.qr || sharing) return;
    Feedback.tap();
    const message = `${ticket.name}'s ticket for ${title}, ${dayText(startsAt)} at ${timeText(startsAt)}. Show this QR at the gate, or the code ${ticket.code}.`;
    const fallback = () => Share.share({ message }).catch(() => undefined);
    if (!svg.current) return void fallback();
    setSharing(true);
    svg.current.toDataURL(
      (base64) => {
        void (async () => {
          try {
            if (!(await Sharing.isAvailableAsync())) return void (await fallback());
            const file = new File(Paths.cache, `ticket-${ticket.code}.png`);
            if (file.exists) file.delete();
            file.create();
            file.write(bytesOf(base64));
            await Sharing.shareAsync(file.uri, { mimeType: 'image/png', dialogTitle: message, UTI: 'public.png' });
          } catch {
            await fallback();
          } finally {
            setSharing(false);
          }
        })();
      },
      { width: 720, height: 720 },
    );
  };

  return (
    <View style={styles.pass}>
      <View style={styles.top}>
        <View style={styles.who}>
          <Text style={styles.count}>{`Ticket ${index + 1} of ${total}`}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {ticket.name}
          </Text>
          <Text style={styles.tier} numberOfLines={1}>
            {ticket.team ? `${ticket.tier} · ${ticket.team}` : ticket.tier}
          </Text>
        </View>
        <Badge label={ticket.checkedInAt ? 'Checked in' : status.label} tone={ticket.checkedInAt ? 'accent' : status.tone} />
      </View>
      {ticket.qr ? (
        <View style={styles.qr}>
          <QrSvg value={ticket.qr} size={232} svgRef={svg} />
        </View>
      ) : (
        <View style={[styles.qr, styles.noQr]}>
          <Ionicons name={ticket.status === 'cancelled' ? 'close-circle-outline' : 'time-outline'} size={40} color={Brand.textMuted} />
          <Text style={styles.noQrText}>{ticket.status === 'cancelled' ? 'This ticket was cancelled.' : 'The QR code shows once it’s paid.'}</Text>
        </View>
      )}
      <View style={styles.codeRow}>
        <Text style={styles.codeLabel}>Code</Text>
        <Text style={styles.code} selectable>
          {ticket.code}
        </Text>
      </View>
      {ticket.qr ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Share ${ticket.name}'s ticket`}
          onPress={share}
          style={({ pressed }) => [styles.share, pressed && styles.pressed]}
        >
          {sharing ? <ActivityIndicator color={Brand.text} /> : <Ionicons name="share-outline" size={18} color={Brand.text} />}
          <Text style={styles.shareText}>Share this ticket</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pass: { gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.xl, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  who: { flex: 1, gap: 2 },
  count: { ...Typography.overline, fontSize: 11, color: Brand.textFaint },
  name: { ...Typography.heading, fontSize: 20, color: Brand.text },
  tier: { ...Typography.caption, color: Brand.textMuted },
  qr: { alignSelf: 'center', padding: Spacing.two, borderRadius: Radius.lg, backgroundColor: '#FFFFFF' },
  noQr: { width: 248, height: 248, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, backgroundColor: Brand.surfaceAlt, padding: Spacing.three },
  noQrText: { ...Typography.caption, color: Brand.textMuted, textAlign: 'center' },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  codeLabel: { ...Typography.caption, color: Brand.textMuted },
  code: { fontFamily: Fonts.bold, fontSize: 24, letterSpacing: 6, color: Brand.text },
  share: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, height: 46, borderRadius: Radius.pill, borderWidth: 1, borderColor: Brand.border },
  shareText: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  pressed: { opacity: 0.7 },
});
