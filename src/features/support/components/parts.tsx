import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Badge } from '@/components/ui/Badge';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { formatDateTime } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import type { SupportPhoto, Ticket } from '@/types/support';
import { CATEGORY_LABEL, PHOTOS_MAX, STATUS } from '../lib/support';

/** One of your tickets: subject, number and topic, its state, and a dot when Ruxstar has replied since you looked. */
export function TicketRow({ ticket, onPress }: { ticket: Ticket; onPress: () => void }) {
  const status = STATUS[ticket.status];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${ticket.subject}, ${status.label}${ticket.unread ? ', new reply' : ''}`}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.flex}>
        <View style={styles.titleLine}>
          {ticket.unread ? <View style={styles.dot} /> : null}
          <Text style={[styles.title, ticket.unread && styles.titleUnread]} numberOfLines={1}>
            {ticket.subject}
          </Text>
        </View>
        <Text style={styles.muted} numberOfLines={1}>
          {[ticket.number, CATEGORY_LABEL[ticket.category], ticket.context?.label, timeAgo(ticket.lastAt)].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Badge label={status.label} tone={status.tone} />
    </Pressable>
  );
}

/** A full-screen look at a help photo. Tap anywhere to close. */
function PhotoModal({ url, onClose }: { url: string | null; onClose: () => void }) {
  return (
    <Modal visible={!!url} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.modal} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close photo">
        {url ? <Image source={{ uri: url }} style={styles.full} contentFit="contain" transition={120} /> : null}
      </Pressable>
    </Modal>
  );
}

export interface BubbleProps {
  text: string;
  photos: SupportPhoto[];
  at: string;
  /** Right-aligned, on your side of the thread. */
  mine: boolean;
  /** Who wrote it, shown above the text. */
  author?: string;
  /** A staff note the customer never sees. */
  internal?: boolean;
}

export function MessageBubble({ text, photos, at, mine, author, internal }: BubbleProps) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <View style={[styles.bubbleWrap, mine && styles.bubbleWrapMine]}>
      {author ? <Text style={styles.author}>{internal ? `${author} · Note for the team` : author}</Text> : null}
      <View style={[styles.bubble, mine && styles.bubbleMine, internal && styles.bubbleNote]}>
        <Text style={styles.text} selectable>
          {text}
        </Text>
        {photos.length ? (
          <View style={styles.photos}>
            {photos.map((p) => (
              <Pressable key={p.id} accessibilityRole="imagebutton" accessibilityLabel="Open photo" onPress={() => setOpen(p.url)}>
                <Image source={{ uri: p.url }} style={styles.photo} contentFit="cover" transition={120} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      <Text style={styles.time}>{formatDateTime(at)}</Text>
      <PhotoModal url={open} onClose={() => setOpen(null)} />
    </View>
  );
}

/** Photos picked for the next message, each with a remove button, and an add tile while there is room. */
export function PickedPhotos({ photos, onAdd, onRemove, disabled }: { photos: ImagePickerAsset[]; onAdd: () => void; onRemove: (index: number) => void; disabled?: boolean }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picked} keyboardShouldPersistTaps="handled">
      {photos.map((p, i) => (
        <View key={p.uri} style={styles.pickedItem}>
          <Image source={{ uri: p.uri }} style={styles.pickedPhoto} contentFit="cover" />
          <Pressable accessibilityRole="button" accessibilityLabel="Remove photo" onPress={() => onRemove(i)} style={styles.remove} hitSlop={8} disabled={disabled}>
            <Ionicons name="close" size={14} color={Brand.text} />
          </Pressable>
        </View>
      ))}
      {photos.length < PHOTOS_MAX ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a photo"
          onPress={onAdd}
          disabled={disabled}
          style={({ pressed }) => [styles.add, pressed && styles.pressed]}
        >
          <Ionicons name="image-outline" size={20} color={Brand.textMuted} />
          <Text style={styles.addLabel}>{photos.length ? `${photos.length}/${PHOTOS_MAX}` : 'Photo'}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  pressed: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 64, paddingVertical: Spacing.two },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Brand.primary },
  title: { ...Typography.body, color: Brand.text, flexShrink: 1 },
  titleUnread: { fontFamily: Typography.bodyStrong.fontFamily },
  muted: { ...Typography.caption, color: Brand.textMuted },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  full: { width: '100%', height: '80%' },
  bubbleWrap: { alignItems: 'flex-start', gap: 4, maxWidth: '86%' },
  bubbleWrapMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  author: { ...Typography.caption, fontSize: 12, color: Brand.textMuted },
  bubble: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 2, borderRadius: Radius.lg, backgroundColor: Brand.surfaceAlt },
  bubbleMine: { backgroundColor: 'rgba(180,92,242,0.22)' },
  bubbleNote: { backgroundColor: 'rgba(255,176,32,0.14)', borderWidth: 1, borderColor: 'rgba(255,176,32,0.35)' },
  text: { ...Typography.body, color: Brand.text, lineHeight: 22 },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  photo: { width: 96, height: 96, borderRadius: Radius.sm, backgroundColor: Brand.surface },
  time: { ...Typography.caption, fontSize: 11, color: Brand.textFaint },
  picked: { gap: Spacing.two },
  pickedItem: { width: 64, height: 64 },
  pickedPhoto: { width: 64, height: 64, borderRadius: Radius.sm, backgroundColor: Brand.surfaceAlt },
  remove: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  add: { width: 64, height: 64, borderRadius: Radius.sm, borderWidth: 1, borderStyle: 'dashed', borderColor: Brand.border, alignItems: 'center', justifyContent: 'center', gap: 2 },
  addLabel: { ...Typography.caption, fontSize: 11, color: Brand.textMuted },
});
