import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Brand } from '@/constants/theme';

/**
 * Where the freelance checkout sends the customer back to. On Android the link opens on top of the order, so it steps
 * back to it; with nothing behind it, it opens the order from the link.
 */
export default function GigsPaidScreen() {
  const router = useRouter();
  const { order } = useLocalSearchParams<{ order?: string }>();

  useEffect(() => {
    if (router.canGoBack()) router.back();
    else if (order) router.replace({ pathname: '/(customer)/gigs/order/[id]', params: { id: order } });
    else router.replace({ pathname: '/(customer)/orders', params: { tab: 'freelance' } });
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
