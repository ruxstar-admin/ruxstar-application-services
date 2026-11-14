import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { fileSize } from '@/features/pod/lib/order';
import type { PrintFile } from '@/types/order';

/** A file in an order. Pressable when it can be opened, with a Download button when it can be saved. */
export function FileRow({ file, onOpen, onDownload, downloading }: { file: PrintFile; onOpen?: () => void; onDownload?: () => void; downloading?: boolean }) {
  return (
    <Pressable accessibilityRole={onOpen ? 'button' : undefined} accessibilityLabel={onOpen ? `View ${file.name}` : undefined} disabled={!onOpen} onPress={onOpen} style={styles.file}>
      <Ionicons name={file.contentType === 'application/pdf' ? 'document-text-outline' : 'image-outline'} size={22} color={Brand.primarySoft} />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {file.name}
        </Text>
        <Text style={styles.meta}>{`${file.pages} ${file.pages === 1 ? 'page' : 'pages'} · ${fileSize(file.bytes)}`}</Text>
      </View>
      {onDownload ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Download ${file.name}`}
          accessibilityState={{ busy: !!downloading }}
          disabled={downloading}
          onPress={onDownload}
          hitSlop={6}
          style={({ pressed }) => [styles.download, pressed && styles.pressed]}
        >
          {downloading ? <ActivityIndicator size="small" color={Brand.primarySoft} /> : <Ionicons name="download-outline" size={16} color={Brand.primarySoft} />}
          <Text style={styles.downloadText}>Download</Text>
        </Pressable>
      ) : onOpen ? (
        <Ionicons name="open-outline" size={18} color={Brand.textMuted} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  file: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  text: { flex: 1, gap: 2 },
  name: { ...Typography.bodyStrong, fontSize: 14, color: Brand.text },
  meta: { ...Typography.caption, fontSize: 12, color: Brand.textFaint },
  download: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Brand.primarySoft,
  },
  pressed: { opacity: 0.7 },
  downloadText: { ...Typography.caption, fontFamily: Fonts.semibold, color: Brand.primarySoft },
});
