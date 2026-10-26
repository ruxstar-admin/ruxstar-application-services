import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Brand, Spacing } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

interface ScreenContainerProps {
  title: string;
  /** Pinned below the scrolling content (primary button). */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/** Standard pushed screen: back header, scrolling body, optional pinned footer. Back is `router.back()`. */
export function ScreenContainer({ title, footer, children }: ScreenContainerProps) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title={title} onBack={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three },
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.four, gap: Spacing.two },
  footer: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, paddingTop: Spacing.two, gap: Spacing.two },
});
