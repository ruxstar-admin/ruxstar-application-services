import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Card, Notice } from '@/features/coaching/components/Parts';
import { fileSize } from '@/features/coaching/lib/materials';
import { errorText } from '@/features/events/lib/messages';
import { formatDateTime } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import type { GigDelivery, GigFile, GigOrder } from '@/types/gigs';
import { openGigFile } from '../lib/open-file';

/**
 * Opens an order's file. Links last 10 minutes, so the order is fetched again first and the fresh link is used.
 * `refetch` gives the order as it is now.
 */
export function useFileOpener(refetch: () => Promise<GigOrder>) {
  const [opening, setOpening] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const open = async (fileId: string) => {
    setOpening(fileId);
    setProblem(null);
    try {
      const order = await refetch();
      const file = [...order.files, ...order.deliveries.flatMap((d) => d.files)].find((f) => f.id === fileId);
      if (file?.url) await openGigFile(file);
      else setProblem('This file isn’t kept any more.');
    } catch (err) {
      Feedback.error();
      setProblem(errorText(err));
    } finally {
      setOpening(null);
    }
  };
  return { opening, problem, open };
}

function FileRow({ file, opening, onOpen }: { file: GigFile; opening: boolean; onOpen: (id: string) => void }) {
  const gone = !file.url;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={gone ? `${file.name}, deleted` : `Open ${file.name}`}
      disabled={gone || opening}
      onPress={() => {
        Feedback.tap();
        onOpen(file.id);
      }}
      style={({ pressed }) => [styles.file, gone && styles.gone, pressed && styles.pressed]}
    >
      <Ionicons name="document-outline" size={20} color={Brand.primarySoft} />
      <View style={styles.flex}>
        <Text style={styles.name} numberOfLines={1}>
          {file.name}
        </Text>
        <Text style={styles.small}>{gone ? 'Deleted' : fileSize(file.bytes)}</Text>
      </View>
      {opening ? <ActivityIndicator color={Brand.primarySoft} size="small" /> : gone ? null : <Ionicons name="download-outline" size={20} color={Brand.textMuted} />}
    </Pressable>
  );
}

export function FileList({ files, opening, onOpen }: { files: readonly GigFile[]; opening: string | null; onOpen: (id: string) => void }) {
  return (
    <View style={styles.files}>
      {files.map((f) => (
        <FileRow key={f.id} file={f} opening={opening === f.id} onOpen={onOpen} />
      ))}
    </View>
  );
}

/** What the customer sent with the order: answers to the gig's questions, a note and files. Hidden when there's none. */
export function BriefCard({ order, opening, onOpen }: { order: GigOrder; opening: string | null; onOpen: (id: string) => void }) {
  if (!order.answers.length && !order.note && !order.files.length) return null;
  return (
    <Card>
      {order.answers.map((a) => (
        <View key={a.question} style={styles.answer}>
          <Text style={styles.small}>{a.question}</Text>
          <Text style={styles.text}>{a.answer}</Text>
        </View>
      ))}
      {order.note ? (
        <View style={styles.answer}>
          <Text style={styles.small}>Note</Text>
          <Text style={styles.text}>{order.note}</Text>
        </View>
      ) : null}
      {order.files.length ? <FileList files={order.files} opening={opening} onOpen={onOpen} /> : null}
    </Card>
  );
}

const ANSWER: Record<NonNullable<GigDelivery['answer']>['kind'], string> = {
  approved: 'Approved',
  revision: 'Changes asked for',
  problem: 'Problem reported',
};

/** One delivery: the freelancer's message, links and files, and how the customer answered it. */
export function DeliveryCard({ delivery, number, opening, onOpen }: { delivery: GigDelivery; number: number; opening: string | null; onOpen: (id: string) => void }) {
  return (
    <Card>
      <Text style={styles.strong}>{number === 1 ? 'Delivery' : `Delivery ${number}`}</Text>
      <Text style={styles.small}>{formatDateTime(delivery.at)}</Text>
      <Text style={styles.text}>{delivery.message}</Text>
      {delivery.links.map((l) => (
        <TextLink key={l} label={`${l.replace(/^https?:\/\//, '')} ›`} onPress={() => void Linking.openURL(l)} />
      ))}
      {delivery.files.length ? <FileList files={delivery.files} opening={opening} onOpen={onOpen} /> : null}
      {delivery.answer ? (
        <Notice
          tone={delivery.answer.kind === 'approved' ? 'success' : delivery.answer.kind === 'problem' ? 'warning' : 'info'}
          text={[ANSWER[delivery.answer.kind], delivery.answer.note].filter(Boolean).join(': ')}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  files: { gap: Spacing.two },
  file: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.two, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  gone: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  flex: { flex: 1, gap: 2 },
  name: { ...Typography.body, fontSize: 15, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
  text: { ...Typography.body, fontSize: 15, color: Brand.text },
  strong: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  answer: { gap: 2 },
});
