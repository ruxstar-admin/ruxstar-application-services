import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useAuthStore } from '@/stores/auth-store';

interface PlaceholderScreenProps {
  title: string;
}

/** Temporary landing screen for a role group until its real dashboard is built. */
export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  const { name, role, clearAuth } = useAuthStore();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          Signed in as {name} · {role}
        </Text>
        <PrimaryButton variant="outline" label="Log out" onPress={clearAuth} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.bg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    ...Typography.title,
    color: Brand.text,
  },
  subtitle: {
    ...Typography.body,
    color: Brand.textMuted,
    marginBottom: Spacing.two,
  },
});
