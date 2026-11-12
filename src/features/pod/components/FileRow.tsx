import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { fileSize } from '@/features/pod/lib/order';
import type { PrintFile } from '@/types/order';

/** A file in an order. Pressable when it can be opened. */
export function FileRow({ file, onOpen }: { file: PrintFile; onOpen?: () => void }) {
  return (
    <Pressable accessibilityRole={onOpen ? 'button' : undefined} disabled={!onOpen} onPress={onOpen} style={styles.file}>
      <Ionicons name={file.contentType === 'application/pdf' ? 'document-text-outline' : 'image-outline'} size={22} color={Brand.primarySoft} />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {file.name}
        </Text>
        <Text style={styles.meta}>{`${file.pages} ${file.pages === 1 ? 'page' : 'pages'} · ${fileSize(file.bytes)}`}</Text>
      </View>
      {onOpen ? <Ionicons name="open-outline" size={18} color={Brand.textMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  file: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  text: { flex: 1, gap: 2 },
  name: { ...Typography.bodyStrong, fontSize: 14, color: Brand.text },
  meta: { ...Typography.caption, fontSize: 12, color: Brand.textFaint },
});
