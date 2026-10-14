import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Brand, Spacing } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

interface AuthFormLayoutProps {
  title: string;
  onBack: () => void;
  /** Pinned to the bottom, above the keyboard (primary button, secondary links). */
  actions: React.ReactNode;
  children: React.ReactNode;
}

/** Shared shell for every pushed auth screen: back header, scrolling-free body, pinned actions. */
export function AuthFormLayout({ title, onBack, actions, children }: AuthFormLayoutProps) {
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={title} onBack={onBack} />
        <Animated.View entering={FadeInUp.duration(350)} style={styles.body}>
          {children}
        </Animated.View>
        <View style={styles.actions}>{actions}</View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Brand.surface, paddingHorizontal: Spacing.three },
  body: { flex: 1, paddingTop: Spacing.four, gap: Spacing.four },
  actions: { gap: Spacing.three, paddingBottom: Spacing.three },
});
