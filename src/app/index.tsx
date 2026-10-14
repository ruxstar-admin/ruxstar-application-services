import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Brand } from '@/constants/theme';

/** Cold-start hydration spinner only — AuthGuard in the root layout owns all redirects. */
export default function Index() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={Brand.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
