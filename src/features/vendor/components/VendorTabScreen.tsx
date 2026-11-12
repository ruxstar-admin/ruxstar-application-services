import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

interface VendorTabScreenProps {
  title: string;
  /** Pull to refresh. */
  onRefresh?: () => Promise<unknown> | void;
  children: React.ReactNode;
}

/** A vendor portal tab: "Vendor portal" and Exit above the title, then the scrolling page. Exit returns to Profile. */
export function VendorTabScreen({ title, onRefresh, children }: VendorTabScreenProps) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <Text style={styles.overline}>Vendor portal</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Exit the vendor portal"
          hitSlop={12}
          onPress={() => {
            Feedback.tap();
            router.dismissTo('/(customer)/(tabs)/profile');
          }}
        >
          <Text style={styles.exit}>Exit</Text>
        </Pressable>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Brand.textMuted} colors={[Brand.primary]} progressBackgroundColor={Brand.surface} /> : undefined
          }
        >
          <Text style={styles.title}>{title}</Text>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.two },
  overline: { ...Typography.overline, color: Brand.textMuted },
  exit: { ...Typography.bodyStrong, color: Brand.primarySoft },
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three },
  title: { ...Typography.title, color: Brand.text },
});
