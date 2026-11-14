import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Brand } from '@/constants/theme';

/**
 * Where the ticket checkout sends the customer back to. On Android the link opens on top of the booking, so it steps
 * back to it; with nothing behind it, it opens the booking from the link.
 */
export default function TicketsPaidScreen() {
  const router = useRouter();
  const { order } = useLocalSearchParams<{ order?: string }>();

  useEffect(() => {
    if (router.canGoBack()) router.back();
    else if (order) router.replace({ pathname: '/(customer)/events/ticket/[id]', params: { id: order } });
    else router.replace('/(customer)/events/tickets');
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
