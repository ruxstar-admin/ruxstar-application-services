import { useEffect, useRef } from 'react';
import { Keyboard, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Brand, Spacing } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

interface AuthFormLayoutProps {
  title: string;
  onBack: () => void;
  /** Rendered after the body (primary button, secondary links). */
  actions: React.ReactNode;
  /** Absolutely-positioned layer above the form (e.g. a Toast). Does not scroll. */
  overlay?: React.ReactNode;
  /** Pass a ref to let a screen scroll the form itself (e.g. when a later field gains focus). */
  scrollRef?: React.RefObject<ScrollView | null>;
  children: React.ReactNode;
}

/** Wait for the keyboard's open animation so we scroll to the final layout, not a mid-animation one. */
const SCROLL_AFTER_KEYBOARD_MS = 60;

/**
 * Shared shell for every pushed auth screen. The body and actions live in one scroll view:
 * with the keyboard closed a spacer pushes the actions to the bottom; with it open they follow
 * the last field at a fixed gap, and the view scrolls so the primary button is on screen as soon
 * as the keyboard appears. Uses only core React Native (works in Expo Go).
 */
export function AuthFormLayout({ title, onBack, actions, overlay, scrollRef, children }: AuthFormLayoutProps) {
  const ownRef = useRef<ScrollView>(null);
  const ref = scrollRef ?? ownRef;

  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => ref.current?.scrollToEnd({ animated: true }), SCROLL_AFTER_KEYBOARD_MS);
    });
    return () => sub.remove();
  }, [ref]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <View style={styles.header}>
          <ScreenHeader title={title} onBack={onBack} />
        </View>
        <ScrollView
          ref={ref}
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInUp.duration(350)} style={styles.body}>
            {children}
          </Animated.View>
          <View style={styles.spacer} />
          <View style={styles.actions}>{actions}</View>
        </ScrollView>
        {overlay}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Brand.surface },
  header: { paddingHorizontal: Spacing.three },
  content: { flexGrow: 1, paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  body: { paddingTop: Spacing.four, gap: Spacing.four },
  spacer: { flexGrow: 1, minHeight: Spacing.four },
  actions: { gap: Spacing.three },
});
