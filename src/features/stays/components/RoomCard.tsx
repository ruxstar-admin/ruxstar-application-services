import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import type { RoomAvailability, RoomView } from '@/types/stays';
import { freeBeds } from '../lib/reserve';
import { FEATURE_LABEL, ROOM_KIND_LABEL, perText, plural, pricesText } from '../lib/stays';
import { BedDots } from './BedDots';

/** One room: kind, beds, features and prices, its beds as dots (free or taken once dates are known), and room for actions. */
export function RoomCard({ room, availability, children }: { room: RoomView; availability?: RoomAvailability | null; children?: ReactNode }) {
  const free = availability ? freeBeds(availability).length : null;
  const beds = availability?.beds ?? room.bedList;
  const sharing = room.kind === 'shared' ? `${room.beds}-sharing` : plural(room.beds, 'bed');
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.name}>{room.name}</Text>
        {room.status === 'paused' ? <Badge label="Full right now" tone="warning" /> : free !== null ? <Badge label={free ? `${free} free` : 'Full for these dates'} tone={free ? 'success' : 'neutral'} /> : null}
      </View>
      <Text style={styles.text}>{`${ROOM_KIND_LABEL[room.kind]} · ${sharing}`}</Text>
      {room.features.length ? <Text style={styles.small}>{room.features.map((f) => FEATURE_LABEL[f]).join(' · ')}</Text> : null}
      <Text style={styles.price}>{`${pricesText(room.prices)} ${perText(room.kind)}`}</Text>
      {room.kind === 'shared' && room.wholeRoom ? <Text style={styles.small}>{`You can also reserve the whole room (all ${room.beds} beds).`}</Text> : null}
      <BedDots beds={beds} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  name: { ...Typography.bodyStrong, fontSize: 16, color: Brand.text, flexShrink: 1 },
  text: { ...Typography.body, fontSize: 15, color: Brand.text },
  price: { ...Typography.caption, fontSize: 14, color: Brand.primarySoft },
  small: { ...Typography.caption, color: Brand.textMuted },
});
