import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Brand } from '@/constants/theme';

/**
 * Where the shop checkout sends the customer back to. On Android the link opens on top of the order, so it steps back to
 * it; with nothing behind it, it opens the order from the link.
 */
export default function StorePaidScreen() {
  const router = useRouter();
  const { order } = useLocalSearchParams<{ order?: string }>();

  useEffect(() => {
    if (router.canGoBack()) router.back();
    else if (order) router.replace({ pathname: '/(customer)/store/order/[id]', params: { id: order } });
    else router.replace({ pathname: '/(customer)/orders', params: { tab: 'shops' } });
  }, [router, order]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={Brand.primarySoft} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.bg },
});
